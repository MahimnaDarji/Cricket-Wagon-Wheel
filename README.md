# CreaseVision

This project is a cricket analytics tool that allows users to create and visualize wagon wheels for innings. It lets you select a ground, define players, record shots ball by ball, and generate a final visual along with a downloadable image. It reflects how analysts and players study shot distribution in real matches.

## Project Overview

Cricket analysis often relies on understanding where runs are scored. This project was built to:

- Capture shot data ball by ball  
- Visualize shot directions using a wagon wheel  
- Support both individual and team-based innings  
- Provide a clean review of player performance  
- Export wagon wheel as an image for sharing  

## Tech Stack

| Layer          | Tools Used                                  |
|----------------|---------------------------------------------|
| Frontend       | HTML, CSS, JavaScript                       |
| UI Design      | Tailwind CSS, Custom Styling                |
| Visualization  | Canvas / SVG Rendering                      |
| Backend        | Node.js, Express                            |
| Authentication | Google OAuth, Session आधारित login          |
| Database       | MongoDB Atlas                               |
| Deployment     | Vercel                                      |

## Features Built

### Stadium Setup
- Select preset stadiums or use custom dimensions  
- Real-time ground visualization with boundary distances  

### Player Setup
- Individual and Team modes  
- Add players with name, batting style, and profile image  
- Support for up to 11 players in team mode  

### Wagon Wheel Creation
- Record runs ball by ball (1 to 6)  
- Each run type mapped to a different color  
- Shot directions plotted from pitch to boundary  

### Review Setup
- View selected player and ground  
- Switch between players in team mode  
- See live wagon wheel updates while recording  

### Innings Flow
- “Next Ball” to continue recording  
- “Complete Innings” to finalize  
- Confirmation before ending innings  

### Export
- Download wagon wheel as image  
- Includes player name, summary, and legend  

### History
- View all past innings  
- Open a saved wagon wheel  
- Download or delete previous records  

### Authentication
- Email signup and login  
- Google login support  
- Forgot password with OTP reset  
- Profile settings for user details  

## Live Website Link

https://cricket-wagon-wheel.vercel.app/index.html

## Insights Discovered

- Shot patterns clearly show player strengths on off side and leg side  
- Certain run types cluster in specific regions  
- Visualizing ball-by-ball data gives better clarity than raw numbers  
- Team mode helps compare players within the same match  

## Why This Project Stands Out

- Covers full flow from setup to final export  
- Supports both individual and team analysis  
- Clean and consistent UI across all pages  
- Real-time visual feedback while recording shots  
- Designed to be simple to use but detailed enough for analysis  
