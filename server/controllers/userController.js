const User = require("../models/User");
const bcrypt = require("bcryptjs");
const logger = require("../logger");
const axios = require("axios");

const CAESAR_SHIFT = 4;

// Funkcja do generowania szyfru Cezara
const generateCaesarCipher = () => {
  const words = [
    "encyklopedia",
    "programowanie",
    "informatyka",
    "komunikacja",
    "interfejs",
    "algorytmika",
    "deweloper",
    "bezpieczeństwo",
    "aplikacja",
    "serwerowy",
  ];
  // Stałe przesunięcie dla szyfru Cezara

  // Wybierz losowe słowo o długości co najmniej 10 liter
  const filteredWords = words.filter((word) => word.length >= 10);
  const randomIndex = Math.floor(Math.random() * filteredWords.length);
  const selectedWord = filteredWords[randomIndex];

  // Szyfr Cezara z przesunięciem 4
  const caesarCipher = (str, shift) => {
    return str.replace(/[a-zA-Z]/g, function (char) {
      const start = char === char.toUpperCase() ? 65 : 97;
      return String.fromCharCode(
        ((char.charCodeAt(0) - start + shift) % 26) + start
      );
    });
  };

  const encryptedWord = caesarCipher(selectedWord, CAESAR_SHIFT);

  return { encryptedWord };
};

// Funkcja do generowania szyfru dla użytkownika
exports.generateCipherForUser = async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      logger.error(`User not found for ID ${userId}`);
      return res.status(404).json({ message: "User not found" });
    }

    if (user.hasSolvedCipher) {
      return res.status(200).json({ message: "Cipher already solved" });
    }

    const { encryptedWord } = generateCaesarCipher();

    user.cipherWordEncrypted = encryptedWord;
    await user.save();

    res.json({ encryptedWord });
  } catch (error) {
    logger.error(
      `Error generating cipher for user ${userId}: ${error.message}`
    );
    res.status(500).json({ message: "Server error" });
  }
};

// Funkcja do odszyfrowania szyfru Cezara
const decryptCaesarCipher = (encryptedStr, shift) => {
  return encryptedStr.replace(/[a-zA-Z]/g, function (char) {
    const start = char === char.toUpperCase() ? 65 : 97;
    // Dodaj 26, aby uniknąć ujemnych wartości
    return String.fromCharCode(
      ((char.charCodeAt(0) - start - shift + 26) % 26) + start
    );
  });
};

exports.verifyCipherSolution = async (req, res) => {
  const userId = req.user?.id; // Użycie operatora optional chaining
  const { decryptedWord } = req.body;

  try {
    if (!userId) {
      logger.error("Nie znaleziono ID użytkownika w żądaniu");
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!decryptedWord) {
      logger.warn(`Użytkownik ${userId} nie podał decryptedWord`);
      return res.status(400).json({ message: "Decrypted word is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      logger.error(`Użytkownik nie znaleziony dla ID ${userId}`);
      return res.status(404).json({ message: "User not found" });
    }

    if (user.hasSolvedCipher) {
      logger.info(`Użytkownik ${user.username} już rozwiązał szyfr`);
      return res.status(200).json({ message: "Cipher already solved" });
    }

    const { cipherWordEncrypted } = user;

    if (!cipherWordEncrypted) {
      logger.error(`Użytkownik ${user.username} nie ma szyfru do weryfikacji`);
      return res
        .status(400)
        .json({ message: "No cipher found for verification" });
    }

    const decryptedCipher = decryptCaesarCipher(
      cipherWordEncrypted,
      CAESAR_SHIFT
    );
    logger.debug(
      `Odszyfrowane słowo: ${decryptedCipher}, Wpisane słowo: ${decryptedWord}`
    );

    if (decryptedCipher.toLowerCase() === decryptedWord.toLowerCase()) {
      user.hasSolvedCipher = true;
      user.cipherWordEncrypted = null;
      await user.save();

      logger.info(`Użytkownik ${user.username} rozwiązał szyfr pomyślnie.`);
      return res.json({ message: "Cipher solved successfully" });
    } else {
      logger.warn(
        `Użytkownik ${user.username} podał niepoprawne rozwiązanie szyfru.`
      );
      return res
        .status(400)
        .json({ message: "Incorrect solution. Please try again." });
    }
  } catch (error) {
    logger.error(
      `Błąd podczas weryfikacji szyfru dla użytkownika ${userId}: ${error.message}`
    );
    console.error(error); // Dodatkowe logowanie do konsoli
    res.status(500).json({ message: "Server error" });
  }
};

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

exports.changeUserPassword = async (req, res) => {
  const { oldPassword, newPassword, recaptchaToken, isFirstLogin } = req.body;
  const userId = req.user.id;

  // Check if reCAPTCHA token is present
  if (!recaptchaToken) {
    logger.error(`reCAPTCHA token missing for user ID ${userId}`);
    return res
      .status(400)
      .json({ message: "reCAPTCHA verification failed. Token missing." });
  }

  console.log("RECAPTCHA_SECRET_KEY:", RECAPTCHA_SECRET_KEY); // Verify secret key loading
  console.log("Received reCAPTCHA Token in Backend:", recaptchaToken); // Confirm token is received

  try {
    // Verify reCAPTCHA token with Google
    const verificationURL = `https://www.google.com/recaptcha/api/siteverify`;

    const params = new URLSearchParams();
    params.append("secret", RECAPTCHA_SECRET_KEY);
    params.append("response", recaptchaToken);
    params.append("remoteip", req.ip); // Optional but recommended

    console.time("recaptchaVerification");
    const response = await axios.post(verificationURL, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 5000, // 5 seconds timeout
    });
    console.timeEnd("recaptchaVerification");

    console.log("reCAPTCHA Verification Response:", response.data); // Log the response

    const { success, "error-codes": errorCodes } = response.data;

    if (!success) {
      logger.error(
        `reCAPTCHA verification failed for user ID ${userId}: ${errorCodes}, response: ${JSON.stringify(
          response.data
        )}`
      );
      return res
        .status(400)
        .json({ message: "reCAPTCHA verification failed.", errorCodes });
    }

    // Proceed with password change
    console.time("findUser");
    const user = await User.findById(userId);
    console.timeEnd("findUser");

    if (!user) {
      logger.error(`User not found for ID ${userId}`);
      return res.status(404).json({ message: "User not found" });
    }

    console.time("passwordComparison");
    const isMatch = await user.matchPassword(oldPassword);
    console.timeEnd("passwordComparison");

    if (!isMatch) {
      logger.error(
        `Password change failed for ${user.username}: Incorrect old password`
      );
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Validate password requirements
    const { requireUpperCase, requireLowerCase, requireSpecialChar } = user;
    let passwordValid = true;
    let errorMessage = "Password must contain:";

    if (requireUpperCase && !/[A-Z]/.test(newPassword)) {
      passwordValid = false;
      errorMessage += " uppercase letter,";
    }
    if (requireLowerCase && !/[a-z]/.test(newPassword)) {
      passwordValid = false;
      errorMessage += " lowercase letter,";
    }
    if (requireSpecialChar && !/[!@#$%^&*]/.test(newPassword)) {
      passwordValid = false;
      errorMessage += " special character,";
    }

    if (!passwordValid) {
      logger.error(
        `Password change failed for ${user.username}: ${errorMessage.slice(
          0,
          -1
        )}`
      );
      return res.status(400).json({
        message: errorMessage.slice(0, -1), // Remove trailing comma
      });
    }

    console.time("passwordHashing");
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    if (isFirstLogin) {
      user.isFirstLogin = false; // Set `isFirstLogin` to false after first password change
    }
    console.timeEnd("passwordHashing");

    console.time("saveUser");
    await user.save();
    console.timeEnd("saveUser");

    // Log successful password change
    logger.info(`Password changed successfully for user ${user.username}`);
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      logger.error(`reCAPTCHA verification timed out for user ID ${userId}`);
      return res.status(504).json({
        message: "reCAPTCHA verification timed out. Please try again.",
      });
    }
    logger.error(`Error in changeUserPassword for ${userId}: ${error.message}`);
    console.error("Error in changeUserPassword:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id,
      username: user.username,
      role: user.role,
      // Add other fields as necessary
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      isFirstLogin: user.isFirstLogin,
      hasChangedPassword: !user.isFirstLogin, // `true` if the user has changed the password
      username: user.username,
      requireUpperCase: user.requireUpperCase,
      requireLowerCase: user.requireLowerCase,
      requireSpecialChar: user.requireSpecialChar,
      hasSolvedCipher: user.hasSolvedCipher, // Dodane pole
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
