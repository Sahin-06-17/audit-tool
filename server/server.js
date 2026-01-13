require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { Sequelize, DataTypes, Op } = require('sequelize');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- MYSQL DATABASE CONNECTION ---
const sequelize = new Sequelize(
  process.env.DB_NAME, 
  process.env.DB_USER, 
  process.env.DB_PASS, 
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306, // Add Port
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // This is needed for many cloud DBs
      }
    }
  }
);

// --- MODEL DEFINITION (The "Table" Structure) ---
const Subscription = sequelize.define('Subscription', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cost: {
    type: DataTypes.FLOAT, // or DECIMAL(10, 2) for better precision
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD'
  },
  renewalDate: {
    type: DataTypes.DATEONLY, // We only care about the date, not the time
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'General'
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Sync database (Create table if it doesn't exist)
sequelize.sync()
  .then(() => console.log('✅ MySQL Database & Tables Synced'))
  .catch(err => console.error('❌ DB Error:', err));


// --- API ROUTES ---

// 1. GET all subs for a specific user
app.get('/api/subs/:userId', async (req, res) => {
  try {
    const subs = await Subscription.findAll({ 
      where: { userId: req.params.userId } 
    });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ADD a new subscription
app.post('/api/subs', async (req, res) => {
  try {
    const newSub = await Subscription.create(req.body);
    res.status(201).json(newSub);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. TOGGLE Active/Paused Status
app.patch('/api/subs/:id', async (req, res) => {
  try {
    const sub = await Subscription.findByPk(req.params.id);
    if (!sub) return res.status(404).json({ error: "Subscription not found" });
    
    // Flip the status
    await sub.update({ active: !sub.active });
    res.json(sub);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. DELETE a subscription
app.delete('/api/subs/:id', async (req, res) => {
  try {
    await Subscription.destroy({
      where: { id: req.params.id }
    });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TEMP: Force trigger an email test
app.post('/api/test-email', async (req, res) => {
  const { email } = req.body;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: '🔥 Test Alert: Subscription Audit',
    text: 'If you are reading this, your email system is working perfectly!'
  };

  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email sent successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- CRON JOB (The "3-Day Alert" Logic) ---
// Runs every day at 9:00 AM server time
cron.schedule('0 9 * * *', async () => {
  console.log('⏰ Running Daily Renewal Check...');
  
  const today = new Date();
  const targetDate = new Date();
  targetDate.setDate(today.getDate() + 3); // 3 days from now
  
  // Format as YYYY-MM-DD for MySQL comparison
  const formattedDate = targetDate.toISOString().split('T')[0];

  try {
    const renewingSubs = await Subscription.findAll({
      where: {
        active: true,
        renewalDate: formattedDate
      }
    });

    if (renewingSubs.length > 0) {
      console.log(`Found ${renewingSubs.length} renewals. Sending emails...`);
      renewingSubs.forEach(sub => sendAlertEmail(sub));
    } else {
      console.log('No renewals found for 3 days from now.');
    }
  } catch (err) {
    console.error('Cron Job Error:', err);
  }
});

// --- EMAILER FUNCTION ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS 
  }
});

const sendAlertEmail = (sub) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: sub.userEmail,
    subject: `⚠️ Renewable Alert: ${sub.name}`,
    text: `Your ${sub.name} subscription ($${sub.cost}) renews on ${sub.renewalDate}. \n\nCheck your dashboard to cancel or pause it.`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) console.log('Error sending email:', error);
    else console.log('Email sent:', info.response);
  });
};

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));