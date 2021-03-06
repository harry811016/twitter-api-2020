const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const passportJWT = require('passport-jwt')
const ExtractJWT = passportJWT.ExtractJwt
const JwtStrategy = passportJWT.Strategy
const moment = require('moment')
const imgur = require('imgur-node-api')
const IMGUR_CLIENT_ID = process.env.IMGUR_CLIENT_ID
const helpers = require('../_helpers')


const db = require('../models')
const { User, Tweet, Reply, Like, Followship } = db

const userController = {
  register: (req, res) => {
    const { account, name, email, password, checkPassword } = req.body
    const errors = []
    if (!account && !name && !email && !password && !checkPassword) {
      errors.push({ status: 'error', message: 'all columns are empty' })
    } else if (!account) {
      errors.push({ status: 'error', message: 'account is empty' })
    } else if (!name) {
      errors.push({ status: 'error', message: 'name is empty' })
    } else if (!email) {
      errors.push({ status: 'error', message: 'email is empty' })
    } else if (!password) {
      errors.push({ status: 'error', message: 'password is empty' })
    } else if (!checkPassword) {
      errors.push({ status: 'error', message: 'checkPassword is empty' })
    }
    if (errors.length) return res.json(...errors);

    return User.findOne({ where: { account } })
      .then(userOwnedAccount => {
        // check account
        if (userOwnedAccount) return res.json({ status: 'error', message: 'this account is registered' })
      })
      .then(() => {
        // check email
        return User.findOne({ where: { email } })
          .then(userOwnedEmail => {
            if (userOwnedEmail) return res.json({ status: 'error', message: 'this email is registered' })

          }).catch(err => console.log(err))
      })
      .then(() => {
        // check password
        if (password === checkPassword) {
          return User.create({
            account,
            name,
            email,
            password: bcrypt.hashSync(password, bcrypt.genSaltSync(10), null),
            role: 'user'
          })
        }
        return res.json({ status: 'error', message: 'password or checkPassword is incorrect' })
      })
      .then(() => res.json({ status: 'success', message: 'register successfully' }))
      .catch(err => console.log(err))
  },

  login: (req, res) => {
    // check input
    const { account, password } = req.body
    const errors = []
    if (!account && !password) {
      errors.push({ status: 'error', message: 'all columns are empty' })
    } else if (!account) {
      errors.push({ status: 'error', message: 'account is empty' })
    } else if (!password) {
      errors.push({ status: 'error', message: 'password is empty' })
    }
    if (errors.length) return res.json(...errors);

    // check user login info
    User.findOne({ where: { account } })
      .then(user => {
        if (!user) return res.json({ status: 'error', message: `can not find user "${user}"` })
        if (!bcrypt.compareSync(password, user.password)) {
          return res.json({ status: 'error', message: 'account or password is incorrect' })
        }

        const payload = { id: user.id }
        const token = jwt.sign(payload, process.env.JWT_SECRET)
        return res.json({
          status: 'success',
          message: 'ok',
          token,
          user: {
            id: user.id,
            account: user.account,
            name: user.name,
            email: user.email,
            role: user.role
          }
        })
      })
  },

  getUser: (req, res) => {
    return User.findByPk(req.params.id, {
      include:
        [Tweet,
          { model: User, as: 'Followings' },
          { model: User, as: 'Followers' }
        ]
    })
      .then(user => {
        return res.json({
          name: user.name,
          account: user.account,
          email: user.email,
          userAvatar: user.avatar,
          userIntroduction: user.introduction,
          tweetCounts: user.Followings.length,
          tweetFollowingCounts: user.Followings.length,
          tweetFollowerCounts: user.Followers.length,
          user: user,
        })
      }).catch(err => console.log(err))
  },

  getUserTweets: (req, res) => {
    return User.findByPk(req.params.id, {
      order: [
        [{ model: Tweet }, 'createdAt', 'DESC'],
      ],
      include: [
        { model: Tweet, include: [Like, Reply] },
      ]
    }).then(user => {
      const data = user.Tweets.map(r => ({
        description: r.dataValues.description.substring(0, 50),
        tweetCreatedAt: moment(r.dataValues.createdAt).fromNow(),
        userName: user.toJSON().name,
        userAvatar: user.toJSON().avatar,
        userAccount: user.toJSON().account,
        replyConut: r.dataValues.Replies.length,
        likeConut: r.dataValues.Likes.length,
        ...r.dataValues,
      }))
      return res.json(data)
    }).catch(err => console.log(err))
  },

  getUserReply: (req, res) => {
    return User.findByPk(req.params.id, {
      order: [
        [{ model: Reply }, 'createdAt', 'DESC'],
      ],
      include: [
        { model: Reply, include: [{ model: Tweet, include: [Like, Reply, User] }] },
      ]
    }).then(user => {
      const data = user.Replies.map(r => ({
        description: r.dataValues.Tweet.description.substring(0, 50),
        tweetCreatedAt: moment(r.dataValues.Tweet.createdAt).fromNow(),
        userName: r.dataValues.Tweet.User.name,
        userAvatar: r.dataValues.Tweet.User.avatar,
        userAccount: r.dataValues.Tweet.User.account,
        replyConut: r.dataValues.Tweet.Replies.length,
        likeConut: r.dataValues.Tweet.Likes.length,
        ...r.dataValues,
      }))
      return res.json(data)
    }).catch(err => console.log(err))
  },

  getUserLike: (req, res) => {
    return User.findByPk(req.params.id, {
      order: [
        [{ model: Like }, 'createdAt', 'DESC'],
      ],
      include: [
        { model: Like, include: [{ model: Tweet, include: [Like, Reply, User] }] },
      ]
    }).then(user => {
      const data = user.Likes.map(r => ({
        description: r.dataValues.Tweet.description.substring(0, 50),
        tweetCreatedAt: moment(r.dataValues.Tweet.createdAt).fromNow(),
        userName: r.dataValues.Tweet.User.name,
        userAvatar: r.dataValues.Tweet.User.avatar,
        userAccount: r.dataValues.Tweet.User.account,
        replyConut: r.dataValues.Tweet.Replies.length,
        likeConut: r.dataValues.Tweet.Likes.length,
        ...r.dataValues,
      }))
      return res.json(data)
    }).catch(err => console.log(err))
  },

  putUser: (req, res) => {
    let { account, name, email, password, passwordConfirm, introduction, avatar, cover } = req.body
    const { id } = req.params

    //check user
    if (helpers.getUser(req).id === Number(id)) {

      if (!req.files) {
        // user change password
        if (password || passwordConfirm) {
          if (password !== passwordConfirm) return res.json({ status: 'error', message: 'password or passwordConfirm is incorrect' })
          return User.findByPk(id)
            .then(user => {
              user.update({
                account,
                name,
                email,
                password: bcrypt.hashSync(password, bcrypt.genSaltSync(10), null)
              }).then(() => { return res.json({ status: 'success', message: 'user info updated successfully' }) })
            }).catch(err => console.log(err))
        }
        // user doesn't change password
        return User.findByPk(id)
          .then(user => {
            user.update({
              account,
              email,
              name,
              introduction,
              avatar,
              cover
            }).then((user) => {
              return res.json({ status: 'success', message: 'user info updated successfully' })
            }).catch(err => console.log(err))
          }).catch(err => console.log(err))
      }

      if (req.files) {
        const uploadAvatarImage = new Promise((resolve, reject) => {
          let imageURL = { avatar: '' }
          imgur.setClientID(IMGUR_CLIENT_ID)
          // upload avatar image
          if (req.files.avatar) {
            imgur.upload(req.files.avatar[0].path, (err, img) => {
              if (err) return reject(err)
              imageURL.avatar = img.data.link
              resolve(imageURL)
            })
          } else {
            imageURL.avatar = null
            resolve(imageURL)
          }
        })

        const uploadCoverImage = new Promise((resolve, reject) => {
          let imageURL = { cover: '' }
          imgur.setClientID(IMGUR_CLIENT_ID)
          // upload cover image
          if (req.files.cover) {
            imgur.upload(req.files.cover[0].path, (err, img) => {
              if (err) return reject(err)
              imageURL.cover = img.data.link
              resolve(imageURL)
            })
          } else {
            imageURL.cover = null
            resolve(imageURL)
          }
        })

        async function updateUser() {
          // user edit profile page and upload image
          let avatarURL = ''
          let coverURL = ''
          if (req.files.avatar) {
            avatarURL = await uploadAvatarImage
              .catch(err => console.log(err))
          }
          if (req.files.cover) {
            coverURL = await uploadCoverImage
              .catch(err => console.log(err))
          }

          return User.findByPk(id)
            .then(user => {
              user.update({
                name: name || user.name,
                introduction: introduction || user.introduction,
                avatar: avatarURL.avatar || user.avatar,
                cover: coverURL.cover || user.cover
              }).then(() => { return res.json({ status: 'success', message: 'user profile updated successfully' }) })

            }).catch(err => console.log(err))
        }
        // user edit profile page with image
        updateUser()
      }

    } else {
      return res.json({ status: "error", "message": "permission denied" })
    }



  },

  getFollowers: (req, res) => {
    return User.findByPk(req.params.id, {
      include: [{ model: User, as: 'Followers' }]
    }).then(user => {
      const data = user.Followers.map(r => ({
        ...r.dataValues,
        followerId: r.id,
        isFollowing: helpers.getUser(req).Followings.map(d => d.id).includes(r.id)
      }))
      return res.json(data)
    }).catch(err => console.log(err))
  },

  getFollowings: (req, res) => {
    return User.findByPk(req.params.id, {
      include: [{ model: User, as: 'Followings' }]
    }).then(user => {
      const data = user.Followings.map(r => ({
        ...r.dataValues,
        followingId: r.id,
        isFollowing: helpers.getUser(req).Followings.map(d => d.id).includes(r.id)
      }))
      return res.json(data)
    }).catch(err => console.log(err))
  },

  addFollowing: (req, res) => {
    if (Number(helpers.getUser(req).id) !== Number(req.body.id)) {
      return Followship.create({
        followerId: helpers.getUser(req).id,
        followingId: req.body.id
      })
        .then((followship) => {
          res.json({ status: 'success', message: '' })
        }).catch(err => console.log(err))
    }
    else {
      res.json({ status: 'error', message: '不能追蹤自己' })
    }

  },

  removeFollowing: (req, res) => {
    return Followship.findOne({
      where: {
        followerId: helpers.getUser(req).id,
        followingId: req.params.followingId
      }
    })
      .then((followship) => {
        followship.destroy()
          .then((followship) => {
            res.json({ status: 'success', message: '' })
          })
      }).catch(err => console.log(err))
  },

  addLike: (req, res) => {
    return Like.create({
      UserId: helpers.getUser(req).id,
      TweetId: req.params.id
    })
      .then((like) => {
        res.json({ status: 'success', message: '' })
      }).catch(err => console.log(err))
  },
  removeLike: (req, res) => {
    return Like.findOne({
      where: {
        UserId: helpers.getUser(req).id,
        TweetId: req.params.id
      }
    })
      .then((like) => {
        like.destroy()
          .then((like) => {
            res.json({ status: 'success', message: '' })
          }).catch(err => console.log(err))
      })
  },

  getTopUsers: (req, res) => {
    return User.findAll({
      include: [
        { model: User, as: 'Followers' }
      ]
    }).then(users => {
      users = users.map(user => ({
        ...user.dataValues,
        FollowerCount: user.Followers.length,
        isFollowed: helpers.getUser(req).Followings.map(d => d.id).includes(user.id)
      }))
      users = users.sort((a, b) => b.FollowerCount - a.FollowerCount).slice(0, 10)
      return res.json({
        users: users
      })
    })
  },
}
module.exports = userController