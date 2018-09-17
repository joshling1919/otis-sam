const mongoose = require('mongoose');
const axios = require('axios');

const { OTIS_MONGO } = process.env;

const { Schema } = mongoose;

const ONE_YEAR_IN_SECS = 31540000000;

const messagesSchema = new Schema({
  attachments: Array,
  avatar_url: String,
  created_at: Number,
  favorited_by: Array,
  group_id: Number,
  id: Number,
  name: String,
  sender_id: String,
  sender_type: String,
  source_guid: String,
  system: Boolean,
  text: String,
  user_id: String,
});
const Message = mongoose.model('Message', messagesSchema);

const highlight = async () => {
  await mongoose.connect(
    OTIS_MONGO,
    { useNewUrlParser: true },
  );
  // const fourYearsAgo = Math.floor((new Date().getTime() - ONE_YEAR_IN_SECS * 3) / 1000);
  // const fourPlusOne = fourYearsAgo + 86400;
  const query = {
    'favorited_by.9': { $exists: true },
    // created_at: { $gte: fourYearsAgo, $lt: fourPlusOne },
  };
  const favMessages = await Message.find(query);

  if (favMessages.length > 0) {
    const randomInd = Math.floor(Math.random() * favMessages.length);
    const highlightedMessage = favMessages[randomInd];
    const highlightedId = highlightedMessage.toJSON().identification;
    const ids = [];
    for (let i = highlightedId - 5; i < highlightedId + 6; i += 1) {
      ids.push(i);
    }
    const wholeConvo = await Message.find({ identification: { $in: ids } });
    return wholeConvo;
  }
  return [];
};

const postConvos = async (convo) => {
  for (let index = 0; index < convo.length; index += 1) {
    const message = convo[index];
    const {
      text, name, attachments, favorited_by,
    } = message;
    const bod = {
      bot_id: '86d158f9dc5eb0377bfb6b6b03',
      text: `(${favorited_by.length} likes) ${name}`,
    };
    if (text) {
      bod.text = `(${favorited_by.length} likes) ${name}: ${text}`;
    }
    if (attachments.length > 0) {
      bod.attachments = attachments;
    }
    await axios.post('https://api.groupme.com/v3/bots/post', bod);
  }
};

exports.lambdaHandler = async (event, context, callback) => {
  const convo = await highlight();
  // api.groupme.com/v3/bots/post
  if (convo.length > 0) {
    const convoDate = new Date(convo[0].created_at * 1000);
    const bod = {
      bot_id: '86d158f9dc5eb0377bfb6b6b03',
      text: `On ${convoDate}, the following conversation happened:`,
    };
    await axios.post('https://api.groupme.com/v3/bots/post', bod);

    await postConvos(convo.reverse());
  }
  mongoose.disconnect();
  return callback(null, { statusCode: 200, body: convo });
};
