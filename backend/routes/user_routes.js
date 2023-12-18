const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const router = Router();
const multer = require('multer');
const path = require('path');
const express = require('express');
const app = express()




app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: (req, file, callBack) => {
        callBack(null, 'uploads')
    },
    filename: (req, file, callBack) => {
        callBack(null, `FunOfHeuristic_${file.originalname}`)
    }
})

let upload = multer({ storage: storage })




router.post('/register', upload.single('image'), async (req, res) => {
    let email = req.body.email
    let password = req.body.password
    let name = req.body.name
    // let image = req.file



    const salt = await bcrypt.genSalt(10)

    const hashedPassword = await bcrypt.hash(password, salt)

    const record = await User.findOne({ email: email })

    if (record) {
        return res.status(400).send({
            message: "Email is already registered"
        });
    } else {
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            image: req.file ? req.file.path : '',
            password: hashedPassword,
            is_admin: 0

        });

        const userData = await user.save();

        //JWT Token

        const { _id } = await userData.toJSON()

        const token = jwt.sign({ _id: _id }, "secret")

        res.cookie("jwt", token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000
        })

        res.send({
            message: "success"
        })
    }
})
router.post("/", async (req, res) => {
    const user = await User.findOne({ email: req.body.email })
    if (!user) {
        return res.status(404).send({
            message: "User not Found"
        })
    }
    if (!(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(400).send({
            message: "Password is Incorrect"
        })
    }

    const token = jwt.sign({ _id: user._id }, "secret");

    res.cookie("jwt", token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 //1 day
    })

    res.send({
        message: "success",
        is_admin: user.is_admin,
    });
})

router.get('/user', async (req, res) => {
    try {
        const cookie = req.cookies['jwt']

        const claims = jwt.verify(cookie, "secret")

        if (!claims) {
            return res.status(401).send({
                message: "unauthenticated"
            })
        }

        const user = await User.findOne({ _id: claims._id })

        const { password, ...data } = await user.toJSON()

        res.send(data)
    } catch (err) {
        return res.status(401).send({
            message: 'unauthenticated'
        })

    }
});

router.post('/logout', (req, res) => {
    res.cookie("jwt", "", { maxAge: 0 })

    res.send({
        message: "success"
    })
})


router.get('/admin', async (req, res) => {
    try {
        let searchQuery = {};
        const { name } = req.query;

        if (name) {
            // If a name parameter is provided, create a case-insensitive regex for searching
            searchQuery = { name: { $regex: new RegExp(name, 'i') } };
        }

        // Use Mongoose to fetch user data from the User collection with the search query
        const users = await User.find({ ...searchQuery, is_admin: 0 });
        const usersWithImageURLs = users.map(user => ({
            name: user.name,
            email: user.email,
            imageURL: `${req.protocol}://${req.get('host')}/${user.image}`,
        }));

        res.json(usersWithImageURLs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/admin/:userName', async (req, res) => {
    const userName = req.params.userName;
    try {
        // Use Mongoose to delete user data from the User collection based on the unique identifier
        const deletedUser = await User.findOneAndDelete({ name: userName });
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET user details by name
router.get('/admin/:userName', async (req, res) => {
    const userName = req.params.userName;
    try {
        const user = await User.findOne({ name: userName });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const userWithImageURL = {
            name: user.name,
            email: user.email,
            imageURL: `${req.protocol}://${req.get('host')}/${user.image}`,
        };
        res.json(userWithImageURL);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT update user details by name
router.put('/admin/:userName', async (req, res) => {
    const userName = req.params.userName;
    const updatedUserData = req.body;
    try {
        // Use Mongoose to update user data in the User collection
        const updatedUser = await User.findOneAndUpdate({ name: userName }, updatedUserData, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Assuming this route is for creating a new admin user
router.post('/admin', upload.single('image'), async (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    let name = req.body.name;

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if the email is already registered (you might have different conditions for admin users)
    const record = await User.findOne({ email: email });

    if (record) {
        return res.status(400).send({
            message: "Email is already registered"
        });
    } else {
        const user = new User({
            name: name,
            email: email,
            image: req.file ? req.file.path : '', // Handle image upload if available
            password: hashedPassword,
            is_admin: 0, // Set the is_admin flag to indicate an admin user

            // You might add additional fields specific to admin users
        });

        try {
            const userData = await user.save();

            // JWT Token
            const { _id } = await userData.toJSON();
            const token = jwt.sign({ _id: _id }, "secret");

            res.cookie("jwt", token, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000
            });

            res.status(201).send({
                message: "Admin user created successfully"
            });
        } catch (error) {
            console.error(error);
            res.status(500).send({
                message: "Server error"
            });
        }
    }
});


module.exports = router