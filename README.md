# WooCommerce Instant Win Reveal Plugin

A WordPress plugin that adds an instant win scratch card game to WooCommerce products. Players can scratch cards to reveal prizes and win rewards.

## Features

- **Scratch Card Game**: Interactive scratch cards with 12 circles (3x4 grid)
- **Prize System**: Configurable prizes with icons and images
- **Auto-Reveal**: Automatic reveal functionality for testing
- **Progress Saving**: Saves scratch progress for each user
- **Responsive Design**: Works on desktop and mobile devices
- **Owl Carousel**: Smooth card navigation with carousel
- **Overlay Scratching**: Easy-to-use overlay system for scratching

## Installation

1. Upload the plugin files to `/wp-content/plugins/wc-instant-win-reveal-plugin/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Configure the plugin settings in WooCommerce > Instant Win Reveal

## Usage

### For Customers

1. Purchase a product with instant win tickets
2. Navigate to the instant win game page
3. Use the carousel to browse through scratch cards
4. Click on gray circles to scratch and reveal prizes
5. Complete all circles to see if you've won

### For Administrators

1. **Configure Products**: Add instant win tickets to WooCommerce products
2. **Set Prizes**: Define prizes with icons, images, and names
3. **Manage Tickets**: View and manage user tickets and progress
4. **Auto-Reveal**: Use auto-reveal for testing purposes

## File Structure

```
wc-instant-win-reveal-plugin/
├── assets/
│   ├── css/
│   │   └── instantwin.css
│   └── js/
│       └── instantwin.js
├── wc-instant-win-reveal.php
├── README.md
├── README-NEW-CARD-STRUCTURE.md
└── README-SCRATCH-SLIDER.md
```

## Technical Details

### Key Features

- **Canvas-Based Scratching**: Individual canvas elements for each circle
- **Progress Persistence**: Saves scratch progress via AJAX and localStorage
- **Responsive Design**: 3x4 grid layout that adapts to screen size
- **Touch Support**: Full touch support for mobile devices
- **Visual Feedback**: Smooth scratch effects and completion detection

### CSS Classes

- `.scratch-circle`: Individual circle container
- `.circle-canvas`: Canvas element for scratching
- `.circle-content`: Content underneath the scratch layer
- `.scratch-circles-container`: Container for the scratch game

### JavaScript Functions

- `initializeScratchCardCircles()`: Initializes canvas for each circle
- `scratchCircle()`: Handles individual circle scratching
- `checkCircleScratchCompletion()`: Checks if a circle is completed
- `checkCardScratchCompletion()`: Checks if all circles are completed
- `saveScratchProgress()`: Saves progress to server
- `initializeScratchSlider()`: Sets up the Owl Carousel

## Configuration

### Adding Instant Win to Products

1. Edit a WooCommerce product
2. Add custom fields for instant win tickets
3. Set the number of tickets and prizes
4. Save the product

### Customizing Prizes

Prizes can be configured with:
- Icons (emoji or custom icons)
- Images (URLs to prize images)
- Names and descriptions
- Win/lose conditions

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

- WordPress 5.0+
- WooCommerce 4.0+
- jQuery 3.0+
- Owl Carousel 2.0+

## Changelog

### Version 1.0.0
- Initial release
- Scratch card functionality
- Canvas-based scratching system
- Progress saving
- Auto-reveal feature
- Responsive design

## Support

For support and questions, please contact the development team.

## License

This plugin is proprietary software. All rights reserved.
