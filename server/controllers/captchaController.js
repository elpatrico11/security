const jwt = require("jsonwebtoken");

const captchaList = [
  { question: "What is the capital of the United Kingdom?", answer: "London" },
  { question: "What is 5 plus 7?", answer: "12" },
  {
    question: "What color do you get when you mix red and white?",
    answer: "Pink",
  },
  {
    question: "What is the largest planet in our Solar System?",
    answer: "Jupiter",
  },
  {
    question: "In which continent is the Sahara Desert located?",
    answer: "Africa",
  },
  { question: "What is the square root of 64?", answer: "8" },
  { question: "What is the primary color of the sun?", answer: "Yellow" },
  {
    question: "What is the name of the famous ship that sank in 1912?",
    answer: "Titanic",
  },
  { question: "How many legs does a spider have?", answer: "8" },
  { question: "What is the boiling point of water in Celsius?", answer: "100" },
  { question: "What is the opposite of 'cold'?", answer: "Hot" },
  { question: "What is 15 divided by 3?", answer: "5" },
  {
    question: "What is the first letter of the English alphabet?",
    answer: "A",
  },
  { question: "What is the smallest prime number?", answer: "2" },
  { question: "What is the color of grass?", answer: "Green" },
];

// Function to select a random CAPTCHA
const getRandomCaptcha = () => {
  const index = Math.floor(Math.random() * captchaList.length);
  return captchaList[index];
};

exports.getCaptcha = (req, res) => {
  const captcha = getRandomCaptcha();
  const captchaToken = jwt.sign(
    { answer: captcha.answer.toLowerCase() },
    process.env.CAPTCHA_SECRET,
    { expiresIn: "5m" } // CAPTCHA valid for 5 minutes
  );

  res.json({
    question: captcha.question,
    captchaToken,
  });
};
