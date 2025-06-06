# Large Switch Card

A custom Home Assistant Lovelace card that provides a large, easy-to-use switch interface for entities like switches, lights, input_booleans, and locks. The card features a modern design, clear status indication, and supports both tap (toggle) and long-press (more info) actions.

## Features
- Large, touch-friendly switch UI
- Supports `switch`, `light`, `input_boolean`, and `lock` entities
- Customizable colors via CSS variables
- Shows entity name, status, and last changed time
- Tap to toggle, long-press for more info
- Responsive design for mobile and desktop

## Installation
1. Copy `large-switch-card.js` to your Home Assistant `www` folder.
2. Add the following to your Lovelace resources:
   ```yaml
   resources:
     - url: /local/large-switch-card.js
       type: module
   ```
3. Refresh your browser.

## Usage Example
```yaml
- type: 'custom:large-switch-card'
  entity: switch.your_switch
  name: Living Room Switch
  icon: mdi:light-switch
```

## Customization
You can override the following CSS variables in your theme or card config:
- `--switch-checked-track-color`: Color when switch is ON (default: #4caf50)
- `--switch-unchecked-track-color`: Color when switch is OFF (default: #e0e0e0)
- `--primary-text-color`, `--secondary-text-color`, etc.

## License
MIT
