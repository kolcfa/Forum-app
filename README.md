# Advanced NoSQL Forum Project

This project is an advanced forum application built with Node.js, Express, and MongoDB. It demonstrates several advanced database concepts including:

- **Sharding:** Configuring a sharded cluster with a shard key.
- **Indexing & Performance Tuning:** Custom indexes (compound, multi-key, text, and TTL) and usage of `explain()` to analyze query performance.
- **CRUD Operations:** Advanced operations including bulk updates and deletions.
- **Aggregation Framework:** Multi-stage aggregation pipelines with stages like `$unwind`, `$group`, `$project`, and `$out`.
- **Security & Role-Based Access Control:** User authentication and role management, with admin-specific operations.
- **Local File Logging:** Instead of writing audit logs to the database, the project logs events to a local file using Winston.
- **Comments Management:** Users can add comments on posts, and admins can delete multiple comments in bulk.
- **User Management:** Admin users have the ability to search, update, and delete users.

## Functionality Overview
User Authentication:
Users can register and log in. Authentication is handled via sessions, and roles (user or admin) determine access to certain routes.

Posts and Comments:
Users can create posts and add comments. The post detail page displays comments. Admin users can perform bulk deletion of comments using checkboxes.

Admin Operations:
Admin users have access to a dedicated admin panel where they can search for users, update user details, and delete users. Additionally, admins can delete posts and run aggregation pipelines.

Sharding and Indexing:
The project demonstrates sharding configuration for the posts collection (using sharding-setup.js) and includes various indexes (text, multi-key, compound, TTL) for performance tuning. There is also a route that uses MongoDB's explain() method to analyze query performance.

Logging:
Instead of writing audit logs to the database, all audit events are logged to a local file (logs/app.log) and to the console using Winston. The logger configuration is found in logger.js.

## File Descriptions
models/User.js:
Defines the user schema with fields such as name, email, password, role, and profilePic. Implements validation and compound indexing.

models/Post.js:
Defines the post schema, including fields for title, content, author, comments, and tags. Configures text, multi-key, and shard-key indexes.

models/Comment.js:
Defines the comment schema with content, reference to a post, and author. Includes a TTL index for automatic expiration (if needed).

models/Group.js:
Defines the group schema used to demonstrate many-to-many relationships between users and groups.

views/*.ejs:
Contains EJS templates for various pages such as login, register, dashboard, profile, post creation, post detail (with comment management), posts list, advanced filter, and admin user management.

sharding-setup.js:
A Node.js script that connects to MongoDB and issues commands to enable sharding on the database and shard the posts collection using the author field.

logger.js:
Configures the Winston logger to output log messages to both a local file and the console.

server.js:
The main application file that sets up Express, connects to MongoDB, defines routes for authentication, posts, comments, admin operations, aggregation, performance tuning, and integrates the local logging mechanism.

## Conclusion
This project serves as a comprehensive demonstration of advanced MongoDB and Node.js features including sharding, indexing, aggregation, bulk operations, role-based access control, and local file logging. It provides a real-world example of how to build a scalable, high-performance application with complex data relationships and administrative capabilities.

Feel free to explore, modify, and extend the project to suit your needs. If you have any questions or need further assistance, please contact the project maintainer
