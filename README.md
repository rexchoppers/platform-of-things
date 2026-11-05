# Platform of Things

A 3D interactive portfolio website built with Three.js. Explore different worlds to learn about my skills, projects, education, and more.

## Overview

Platform of Things is a first-person exploration experience where each section of a traditional portfolio is a world to walk around.

The worlds are being rebuilt in Blender, one at a time. Hearth, a campsite in a forest clearing, Chronicle, an open-air cinema showing my story, Grove, a night garden with my skills floating over flower beds, and Haven, a graduation stage with my qualifications on the big board, are done. Everything from the previous version is in [`archive/`](archive/README.md), ready to bring back.

## Controls

| Key | Action |
|-----|--------|
| W / Arrow Up | Move forward |
| S / Arrow Down | Move backward |
| A / Arrow Left | Strafe left |
| D / Arrow Right | Strafe right |
| Space | Jump |
| Shift | Sprint |
| E | Interact |
| Mouse | Look around |

## Tech Stack

- **Three.js** - 3D graphics library
- **Blender** - World building and sky baking
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/rexchoppers/platform-of-things.git

# Navigate to the project directory
cd platform-of-things

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

The site will be available at `http://localhost:5173`

### Build

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

## Project Structure

```
archive/             # The previous game and items, kept for restoring
blender/             # World sources and export scripts (see blender/README.md)
src/
├── assets/          # Music, sky textures, and exported worlds
├── config/          # World colours and names
├── core/            # Scene and player
├── environment/     # Sky, terrain, campfire, and world loading
├── systems/         # World manager and music
├── ui/              # Start screen and HUD
├── Game.ts          # Main game class
├── main.ts          # Entry point
└── style.css        # Styles
```

## Live

Visit [rexchoppers.com](https://rexchoppers.com)

## Vibe Coded?

A lot of AI was used in order to build the assets, lighting etc.. Helped me learn Three.js fast. 3D games are not my strongest skill and the machines haven't replaced me (yet)

## Credits

See [CREDITS.md](CREDITS.md) for full attribution of third-party assets, logos, and libraries used in this project.

## License

MIT License - see [LICENSE](LICENSE) for details.

