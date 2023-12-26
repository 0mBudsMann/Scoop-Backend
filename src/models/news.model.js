import mongoose from "mongoose";
const { model, Schema } = mongoose;


const newsSchema = new Schema(
  {
    Headline: {
      type: String,
      required: true,
      min: 2,
      max: 200,
    },
    Location: {
      type: String,
      default: "",
    },
    Headimage:{
      type: String,
    },
    // Storing HTML file as a string
    Description: {
      type: String,
      
     
    },
    Tags: [
      {
        type: String,
        default: "",
      },
    ],
    UpvoteCount: {
      type: Number,
      default: 0,
    },
    Upvotes:  // Stores upvotes made on the news
    [
        {
          type: Schema.Types.ObjectId,
          ref: "User"
        }
    ],
    User: {    // which user has created the news
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    Comments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Comment",
      },
    ],
  },
  { timestamps: true },
);

const News = model("News", newsSchema);

export default News;
