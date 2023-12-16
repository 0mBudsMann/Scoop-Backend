import News from "../models/news.model.js";
import User from "../models/user.model.js";
import {
  response_200,
  response_201,
  response_404,
  response_400,
  response_500,
  response_204,
} from "../utils/responseCodes.js";
import mongoose from "mongoose";


export async function latestnews(req, res) {
  try {
    const news = await News.find().sort({ createdAt: -1 });

    if (!news) {
      return response_404(res, "News not found");
    }

    // res.status(200).json({ news });
    return response_200(res, "latest News", { news });
  } catch (error) {
    console.error("Error fetching latest news:", error);
    return response_500(res, "Internal server error");
  }
}

export async function postNews(req, res) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const {
      Headline,
      Location,
      Description,
      Tags, // Upvotes and upvoteCount is not taken as during posting it must be empty
      Comments,
    } = req.body;

    const news = new News({
      Headline: Headline,
      Location: Location,
      Description: Description,
      Tags: Tags,
      Comments: Comments,
      User: req.userId,
    });

    const postedNews = await news.save({ session });

    await User.findByIdAndUpdate(
      req.userId,
      { $push: { News: postedNews._id } },
      { session }
    );

    // commit the transaction
    await session.commitTransaction();

    return response_201(res, "News posted successfully", {
      id: postedNews._id,
      Headline: postedNews.Headline,
    });
  } catch (err) {
    await session.abortTransaction();
    return response_500(res, "Error in posting news", err);
  } finally {
    session.endSession();
  }
}

export async function upvoteNews(req, res) {
  try {
    const newsId = req.params.scoopId;

    // checking if news exists
    const news = await News.findById(newsId);
    if (!news) return response_404(res, "News Not Found");

    // checking if user has already upvoted
    if (news.Upvotes.includes(req.userId))
      return response_400(res, "Already upvoted");

    // updating news upvote count
    await News.findByIdAndUpdate(
      newsId,
      { $push: {Upvotes: req.userId},
        UpvoteCount: news.UpvoteCount +  1 },
    );


    return response_201(res, "News upvoted successfully", {
      news_id: news._id,
      upvotes: news.UpvoteCount + 1,
    });
  } catch (err) {
    return response_500(res, "Error in Upvoting", err);
  } 
}

export async function getNews(req, res) {
  try {
    const newsId = req.params.scoopId;
    console.log(newsId);
    // checking if news exists
    const news = await News.findById(newsId);
    if (!news) return response_404(res, "News Not Found");

    return response_200(res, "News Retrieved", news);

  } catch (err) {
    return response_500(res, "Error in Retrieving News", err);
  }
}

export async function deleteNews(req, res) {
  const session = await mongoose.startSession();
  try {
    const newsId = req.params.scoopId;

    // checking if news exists
    const news = await News.findById(newsId);
    if (!news) return response_404(res, "News Not Found");
    // checking if this user has created the news
    if(news.User != req.userId) return response_404(res, "This News is not created by this User");

    // writing a trasaction for upvoting
    session.startTransaction();
    // deletion query in News
    await News.findByIdAndDelete(newsId, { session });

    // update query in User
    await User.findByIdAndUpdate(req.userId, {$pull : {News: newsId}}, {session});

    // commit the transaction
    await session.commitTransaction();
    
    return response_200(res, "News deleted successfully");

  } catch (err) {
    await session.abortTransaction();
    return response_500(res, "Error in deleting news", err);
  } finally {
    session.endSession();
} 
}


export async function topNews(req, res) {
  try {
    const news = await News.find({}).sort({ UpvoteCount: -1 });
    res.status(200).send(news);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal Server Error" });
  }
}

export async function credibleNews(req, res) {
  try {
    const users = await User.find({}).sort({ myUpvotes: -1 });
    const usersNews = users.map((user) => getNewsOfUser(user.News));
    Promise.all(usersNews)
      .then((usersNews) => {
        const credibleNews = usersNews.reduce(
          (acc, news) => acc.concat(news),
          [],
        );
        res.status(200).send(credibleNews);
      })
      .catch((error) => {
        res
          .status(500)
          .send({ error: "Internal Server Error", details: error.message });
      });
  } catch (err) {
    res.status(500).send({ error: "Internal Server Error" });
  }
}

function getNewsOfUser(newsIds) {
  return new Promise((resolve, reject) => {
    News.find({
      _id: {
        $in: newsIds,
      },
    })
      .then((news) => {
        resolve(news);
      })
      .catch(() => {
        reject();
      });
  });
}
