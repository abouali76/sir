const bcrypt = require('bcryptjs');
const hash = '$2a$12$dPRghu7yKaII0//FFnG11.0I536MmFQOomZbBhMQ/8h4GhLfKDZqi';
bcrypt.compare('Admin@12345', hash).then(console.log);
