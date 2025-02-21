require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const logger = require('./logger');

const app = express();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected successfully.');
        logger.info('MongoDB connected successfully.');
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
        logger.error('MongoDB connection error: ' + err);
    });

const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');
const Group = require('./models/Group');

app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {secure: process.env.NODE_ENV === 'production'}
}));
app.use(flash());

app.use((req, res, next) => {
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    res.locals.user = req.session.user || null;
    next();
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({storage});

function isAuthenticated(req, res, next) {
    if (req.session.user) return next();
    res.redirect('/login');
}

function hasRole(role) {
    return (req, res, next) => {
        if (req.session.user && req.session.user.role === role) return next();
        req.flash('error', 'You are not authorized to view that resource.');
        res.redirect('/dashboard');
    };
}

app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

app.get('/register', (req, res) => {
    res.render('register', {title: 'Register'});
});

app.post('/register', async (req, res) => {
    const {name, email, password, role} = req.body;
    if (!name || !email || !password) {
        req.flash('error', 'Please fill in all fields.');
        return res.redirect('/register');
    }
    if (password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters.');
        return res.redirect('/register');
    }
    try {
        const existingUser = await User.findOne({email});
        if (existingUser) {
            req.flash('error', 'Email already registered.');
            return res.redirect('/register');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'user'
        });
        await newUser.save();

        logger.info(`User Registration: ${newUser.email} (ID: ${newUser._id})`);

        req.flash('success', 'Registration successful. Please log in.');
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        logger.error('Error during registration: ' + err);
        req.flash('error', 'An error occurred during registration.');
        res.redirect('/register');
    }
});

app.get('/login', (req, res) => {
    res.render('login', {title: 'Login'});
});

app.post('/login', async (req, res) => {
    const {email, password} = req.body;
    try {
        const user = await User.findOne({email});
        if (!user) {
            req.flash('error', 'Email not registered.');
            return res.redirect('/login');
        }
        if (user.locked) {
            req.flash('error', 'Your account is locked due to too many failed login attempts.');
            return res.redirect('/login');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            user.failedLogins += 1;
            if (user.failedLogins >= 5) {
                user.locked = true;
            }
            await user.save();
            req.flash('error', 'Incorrect password.');
            return res.redirect('/login');
        }
        user.failedLogins = 0;
        await user.save();

        req.session.user = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            profilePic: user.profilePic
        };

        logger.info(`User Login: ${user.email} (ID: ${user._id})`);

        req.flash('success', 'Welcome back, ' + user.name + '!');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        logger.error('Error during login: ' + err);
        req.flash('error', 'An error occurred during login.');
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render('profile', {title: 'Profile', user, edit: false});
    } catch (err) {
        console.error(err);
        logger.error('Error loading profile: ' + err);
        req.flash('error', 'Unable to load profile.');
        res.redirect('/dashboard');
    }
});

app.get('/profile/edit', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        res.render('profile', {title: 'Edit Profile', user, edit: true});
    } catch (err) {
        console.error(err);
        logger.error('Error loading profile for edit: ' + err);
        req.flash('error', 'Unable to load profile.');
        res.redirect('/dashboard');
    }
});

app.post('/profile/edit', isAuthenticated, upload.single('profilePic'), async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (req.body.name) {
            user.name = req.body.name;
        }
        if (req.file) {
            user.profilePic = '/uploads/' + req.file.filename;
        }
        await user.save();

        req.session.user.name = user.name;
        req.session.user.profilePic = user.profilePic;

        logger.info(`Profile Updated: ${user.email} (ID: ${user._id})`);

        req.flash('success', 'Profile updated successfully.');
        res.redirect('/profile');
    } catch (err) {
        console.error(err);
        logger.error('Error updating profile: ' + err);
        req.flash('error', 'Error updating profile.');
        res.redirect('/profile');
    }
});

app.post('/profile/delete', isAuthenticated, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.session.user.id);
        logger.info(`User Deleted: ID ${req.session.user.id}`);
        req.session.destroy(err => {
            if (err) console.error(err);
            res.redirect('/register');
        });
    } catch (err) {
        console.error(err);
        logger.error('Error deleting user: ' + err);
        req.flash('error', 'Error deleting account.');
        res.redirect('/profile');
    }
});

app.get('/posts/new', isAuthenticated, (req, res) => {
    res.render('posts', {title: 'New Post', post: null});
});

app.post('/posts', isAuthenticated, async (req, res) => {
    const {title, content, tags} = req.body;
    try {
        const newPost = await Post.create({
            title,
            content,
            author: req.session.user.id,
            tags: tags ? tags.split(',').map(t => t.trim()) : []
        });
        logger.info(`Post Created: ID ${newPost._id} by ${req.session.user.email}`);
        req.flash('success', 'Post created successfully.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        logger.error('Error creating post: ' + err);
        req.flash('error', 'Error creating post.');
        res.redirect('/posts/new');
    }
});

app.get('/posts', isAuthenticated, async (req, res) => {
    try {
        const posts = await Post.find().populate('author', 'name').sort({createdAt: -1});
        res.render('postsList', {title: 'All Posts', posts});
    } catch (err) {
        console.error(err);
        logger.error('Error fetching posts: ' + err);
        req.flash('error', 'Error fetching posts.');
        res.redirect('/dashboard');
    }
});

app.get('/posts/advanced-filter', isAuthenticated, (req, res) => {
    res.render('postsAdvancedFilter', {title: 'Advanced Filter', posts: [], aggregatedResults: null, bulkResult: null});
});

app.post('/posts/advanced-filter', isAuthenticated, async (req, res) => {
    const {keyword, tag} = req.body;
    let matchStage = {};
    if (keyword) {
        matchStage.$text = {$search: keyword};
    }
    if (tag) {
        matchStage.tags = tag;
    }
    try {
        const pipeline = [
            {$match: matchStage},
            {$unwind: "$tags"},
            {$group: {_id: "$tags", count: {$sum: 1}}},
            {$project: {tag: "$_id", count: 1, _id: 0}}
        ];
        const aggregatedResults = await Post.aggregate(pipeline).exec();

        const bulkResult = await Post.bulkWrite([
            {
                updateMany: {
                    filter: matchStage,
                    update: {$push: {tags: "updated"}}
                }
            }
        ]);

        const posts = await Post.find(matchStage).populate('author', 'name').sort({createdAt: -1});
        res.render('postsAdvancedFilter', {title: 'Advanced Filter', posts, aggregatedResults, bulkResult});
    } catch (err) {
        console.error(err);
        logger.error('Error filtering posts: ' + err);
        req.flash('error', 'Error filtering posts.');
        res.redirect('/posts/advanced-filter');
    }
});

app.get('/posts/:id', isAuthenticated, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('author', 'name email')
            .populate({
                path: 'comments',
                populate: {path: 'author', select: 'name'}
            });
        if (!post) {
            req.flash('error', 'Post not found.');
            return res.redirect('/posts');
        }
        res.render('postDetail', {title: post.title, post});
    } catch (err) {
        console.error(err);
        logger.error('Error loading post: ' + err);
        req.flash('error', 'Error loading post.');
        res.redirect('/posts');
    }
});

app.post('/posts/:id/comments', isAuthenticated, async (req, res) => {
    const {content} = req.body;
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            req.flash('error', 'Post not found.');
            return res.redirect('/posts');
        }
        const comment = await Comment.create({
            content,
            post: post._id,
            author: req.session.user.id
        });
        post.comments.push(comment._id);
        await post.save();

        logger.info(`Comment Created: ID ${comment._id} on Post ${post._id} by ${req.session.user.email}`);
        req.flash('success', 'Comment added successfully.');
        res.redirect(`/posts/${post._id}`);
    } catch (err) {
        console.error(err);
        logger.error('Error adding comment: ' + err);
        req.flash('error', 'Error adding comment.');
        res.redirect(`/posts/${req.params.id}`);
    }
});

app.post('/admin/comments/bulk-delete', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
        let {commentIds} = req.body;
        if (!Array.isArray(commentIds)) {
            commentIds = [commentIds];
        }
        await Comment.deleteMany({_id: {$in: commentIds}});
        await Post.updateMany({}, {$pull: {comments: {$in: commentIds}}});

        logger.info(`Bulk Comment Deletion: Deleted comments [${commentIds.join(', ')}] by admin ${req.session.user.email}`);
        req.flash('success', 'Selected comments deleted successfully.');
        res.redirect('back');
    } catch (err) {
        console.error(err);
        logger.error('Error deleting selected comments: ' + err);
        req.flash('error', 'Error deleting selected comments.');
        res.redirect('back');
    }
});

app.post('/admin/posts/:id/delete', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
        await Post.findByIdAndDelete(req.params.id);
        logger.info(`Post Deleted: ID ${req.params.id} by admin ${req.session.user.email}`);
        req.flash('success', 'Post deleted successfully.');
        res.redirect('/posts');
    } catch (err) {
        console.error(err);
        logger.error('Error deleting post: ' + err);
        req.flash('error', 'Error deleting post.');
        res.redirect('/posts');
    }
});

app.post('/admin/users/:id/delete', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        logger.info(`User Deleted: ID ${req.params.id} by admin ${req.session.user.email}`);
        req.flash('success', 'User deleted successfully.');
        res.redirect('/admin/users');
    } catch (err) {
        console.error(err);
        logger.error('Error deleting user: ' + err);
        req.flash('error', 'Error deleting user.');
        res.redirect('/admin/users');
    }
});

app.get('/posts/aggregation', isAuthenticated, hasRole('admin'), async (req, res) => {
    try {
        const pipeline = [
            {$unwind: "$tags"},
            {$group: {_id: "$tags", totalPosts: {$sum: 1}}},
            {$project: {tag: "$_id", totalPosts: 1, _id: 0}},
            {$out: "postsAggregation"}
        ];
        await Post.aggregate(pipeline).exec();
        logger.info('Aggregation pipeline executed and output saved.');
        req.flash('success', 'Aggregation pipeline executed and output saved.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        logger.error('Error running aggregation pipeline: ' + err);
        req.flash('error', 'Error running aggregation pipeline.');
        res.redirect('/dashboard');
    }
});

app.get('/posts/explain', isAuthenticated, async (req, res) => {
    try {
        const explainResult = await Post.find({tags: "updated"}).explain("executionStats");
        res.json(explainResult);
    } catch (err) {
        console.error(err);
        logger.error('Error running explain query: ' + err);
        res.status(500).send("Error running explain query.");
    }
});

app.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const posts = await Post.find().populate('author', 'name').sort({createdAt: -1}).limit(5);
        res.render('dashboard', {title: 'Dashboard', user: req.session.user, posts});
    } catch (err) {
        console.error(err);
        logger.error('Error loading dashboard: ' + err);
        req.flash('error', 'Error loading dashboard.');
        res.redirect('/login');
    }
});

app.get('/admin', isAuthenticated, hasRole('admin'), (req, res) => {
    res.send('Welcome to the admin area.');
});

app.get('/admin/users', isAuthenticated, hasRole('admin'), async (req, res) => {
    const {email} = req.query;
    if (!email) return res.render('adminUsers', {title: 'Admin - User Management', foundUser: null});
    try {
        const foundUser = await User.findOne({email});
        if (!foundUser) {
            req.flash('error', 'User not found.');
            return res.redirect('/admin/users');
        }
        res.render('adminUsers', {title: 'Admin - User Management', foundUser});
    } catch (err) {
        console.error(err);
        logger.error('Error searching for user: ' + err);
        req.flash('error', 'Error searching for user.');
        res.redirect('/admin/users');
    }
});

app.post('/admin/users/update', isAuthenticated, hasRole('admin'), async (req, res) => {
    const {userId, name, email, role} = req.body;
    try {
        await User.findByIdAndUpdate(userId, {name, email, role});
        logger.info(`User Updated: ID ${userId} by admin ${req.session.user.email}`);
        req.flash('success', 'User updated successfully.');
    } catch (err) {
        console.error(err);
        logger.error('Error updating user: ' + err);
        req.flash('error', 'Error updating user.');
    }
    res.redirect('/admin/users');
});

app.get('/groups/new', isAuthenticated, hasRole('admin'), (req, res) => {
    res.send('Group creation form goes here.');
});
app.post('/groups', isAuthenticated, hasRole('admin'), async (req, res) => {
    const {name, description} = req.body;
    try {
        const newGroup = await Group.create({name, description});
        logger.info(`Group Created: ${newGroup.name} by admin ${req.session.user.email}`);
        req.flash('success', 'Group created successfully.');
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        logger.error('Error creating group: ' + err);
        req.flash('error', 'Error creating group.');
        res.redirect('/dashboard');
    }
});

app.post('/groups/:groupId/add-member', isAuthenticated, async (req, res) => {
    const {groupId} = req.params;
    try {
        await Group.findByIdAndUpdate(groupId, {$push: {members: req.session.user.id}});
        logger.info(`User ${req.session.user.email} joined group ${groupId}`);
        req.flash('success', 'You have joined the group.');
    } catch (err) {
        console.error(err);
        logger.error('Error joining group: ' + err);
        req.flash('error', 'Error joining group.');
    }
    res.redirect('/dashboard');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    logger.info(`Server started on port ${PORT}`);
});
