const Photo = require('../models/photo.model');
const Voter = require('../models/Voter.model');
const requestIp = require("request-ip");

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {

  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    if (title && author && email && file) {
      const authorPattern = new RegExp(
        /(<\s*(strong|em)*>(([A-z]|\s)*)<\s*\/\s*(strong|em)>)|(([A-z]|\s|\.)*)/,
        "g"
      );
      const emailPattern = new RegExp(
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "g"
      );
      const titlePattern = new RegExp(
        /(<\s*(strong|em)*>(([A-z]|\s)*)<\s*\/\s*(strong|em)>)|(([A-z]|\s|\.)*)/,
        "g"
      );

      if (!authorPattern.test(author)) {
        throw new Error("Invalid author");
      }
      if (!emailPattern.test(email)) {
        throw new Error("Invalid email");
      }
      if (!titlePattern.test(title)) {
        throw new Error("Invalid title");
      }

      const fileName = file.path.split("/").slice(-1)[0]; // Cut only filename from full path (C:/test/abc.jpg -> abc.jpg)
      const fileExt = fileName.split(".").slice(-1)[0];

      if (
        (fileExt[1] === ".jpg" || ".png" || ".gif") &&
        title.length <= 25 &&
        author.length <= 50
      ) {
        const newPhoto = new Photo({
          title,
          author,
          email,
          src: fileName,
          votes: 0,
        });
        await newPhoto.save();
        res.json(newPhoto);

      } else {
        throw new Error("Wrong file type!");
      }

    } else {
      throw new Error('Wrong input!');
    }

  } catch (err) {
    res.status(500).json(err);
  }

};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {

  try {
    res.json(await Photo.find());
  } catch (err) {
    res.status(500).json(err);
  }

};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {

  try {

    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    const clientIp = requestIp.getClientIp(req);
    const voter = await Voter.findOne({ user: clientIp })

    // Checking if there is a user with this IP in the voter DB
    if (!voter) {
      // If the user is not found, create a new user and increase the number of votes for the photo
      const newVoter = new Voter({ user: clientIp, votes: photoToUpdate._id })
      await newVoter.save();
      photoToUpdate.votes++;
      photoToUpdate.save();
      res.send({ message: 'OK' });

    } else {
      //If the user is found, we check whether he voted for this photo
      if (voter.votes.includes(photoToUpdate._id)) {
        // If the user has already voted for this photo, return an error
        throw new Error('You have already voted!');

      } else {
        // If the user has not yet voted for this photo, we increase the number of votes and save the user's vote
        voter.votes.push(photoToUpdate._id);
        voter.save();
        photoToUpdate.votes++;
        photoToUpdate.save();
        res.send({ message: 'OK' });
      }
    }
  } catch (err) {
    res.status(500).json(err);
  }

};
