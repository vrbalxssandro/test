# ⏳ Guess the Year Game

A fun and interactive web-based game where players guess the year of significant historical and cultural events. This project is built with vanilla HTML, CSS, and JavaScript, focusing on a clean UI, smooth animations, and a simple, engaging gameplay loop.

 <!-- You can take your own screenshot and upload it to GitHub and replace this link -->

## ✨ Features

-   **Random Event-Based Questions**: Each round presents a new event from a curated list.
-   **Interactive Feedback**: Tells you if your guess is "Too High" or "Too Low".
-   **Score Tracking**: Keeps track of your correct answers.
-   **Sleek, Modern UI**: A clean, card-based design that is fully responsive.
-   **Fun Animations**: Subtle animations for correct and incorrect answers to enhance the user experience.
-   **No External Libraries**: Built with just HTML, CSS, and JavaScript. No frameworks, no fuss.

## 🚀 How to Play

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/your-repo-name.git
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd your-repo-name
    ```
3.  **Open `index.html` in your favorite web browser.**
4.  That's it! Start guessing!

You can also play a live version here: [Link to your GitHub Pages URL]

## 🔧 How to Customize

It's very easy to add your own events to the game!

1.  Open the `script.js` file.
2.  Find the `events` array near the top of the file.
3.  Add a new object to the array with the following structure:

    ```javascript
    {
        text: "Your event description here.",
        year: 2023, // The correct year
        image: "https://link-to-your-image.com/image.png" // A direct link to an image
    }
    ```

4.  Save the file, and your new event will automatically be included in the game!

## 🛠️ Built With

-   **HTML5**: For the structure and content.
-   **CSS3**: For styling, layout (Flexbox), and animations.
-   **JavaScript (ES6+)**: For the game logic and DOM manipulation.

Enjoy the game!
