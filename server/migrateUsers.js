const mongoose = require("mongoose");
const User = require("./models/User"); // Adjust the path based on your project structure

const migrateUsers = async () => {
  try {
    // Connect to the MongoDB database
    await mongoose.connect("mongodb://localhost:27017/security", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Update existing users to add the new fields with default values
    const result = await User.updateMany(
      {}, // Empty filter to match all users
      {
        $set: {
          passwordMinLength: 8, // Set default minimum length
          requireUpperCase: false, // Default for requiring uppercase
          requireSpecialChar: false, // Default for requiring special characters
        },
      }
    );

    console.log(`${result.modifiedCount} user(s) updated successfully!`);
  } catch (error) {
    console.error("Error during user migration:", error);
  } finally {
    // Close the database connection
    mongoose.connection.close();
  }
};

// Execute the migration
migrateUsers();
