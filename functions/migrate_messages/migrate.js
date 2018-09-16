const axios = require('axios');
const mongoose = require('mongoose');

const { GOCHU_BROS_MESSAGES, OTIS_MONGO } = process.env;

const { Schema } = mongoose;

const messagesSchema = new Schema({
  attachments: Array,
  avatar_url: String,
  created_at: Number,
  favorited_by: Array,
  group_id: Number,
  id: Number,
  name: String,
  sender_id: Number,
  sender_type: String,
  source_guid: String,
  system: Boolean,
  text: String,
  user_id: Number,
});
const Message = mongoose.model('Message', messagesSchema);

const recursiveAxios = (res) => {
  if (res) {
    console.log('DIS WAS RESPONSE', res.data);
    const {
      response: { messages },
    } = res.data;
    Message.insertMany(messages);
    const lastMessage = messages.slice(-1)[0];
    const lastMessageId = lastMessage.id;
    axios
      .get(`${GOCHU_BROS_MESSAGES}&&limit=100&&before_id=${lastMessageId}`)
      .then(newRes => recursiveAxios(newRes))
      .catch(e => console.log(e));
  } else {
    axios
      .get(`${GOCHU_BROS_MESSAGES}&&limit=100`)
      .then(newRes => recursiveAxios(newRes))
      .catch(e => console.log(e));
  }
};

exports.lambdaHandler = async (event, context, callback) => {
  mongoose
    .connect(
      OTIS_MONGO,
      { useNewUrlParser: true },
    )
    .then(() => recursiveAxios())
    .catch(e => console.log(e));
  return callback(null, { statusCode: 200, body: 'results' });
};
