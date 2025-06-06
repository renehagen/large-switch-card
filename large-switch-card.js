class LargeSwitchCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error('You need to define an entity');
        }
        this.config = config;
        // Set default climate modes if not provided
        if (this.config.entity.startsWith('climate.') && (!this.config.climate_on_mode || !this.config.climate_off_mode)) {
            this.config.climate_on_mode = this.config.climate_on_mode || 'heat';
            this.config.climate_off_mode = this.config.climate_off_mode || 'off';
        }
        this.render();
    }

    set hass(hass) {
        this._hass = hass;
        if (this.config) {
            this.updateCard();
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                }
                ha-card {
                    background: var(--card-background-color, #fff);
                    border-radius: 16px;
                    padding: 12px;
                    box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,0.1));
                    cursor: pointer;
                    user-select: none;
                    transition: all 0.2s ease;
                    position: relative;
                    min-height: 80px;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    align-items: center;
                    box-sizing: border-box;
                }
                ha-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--ha-card-box-shadow, 0 4px 16px rgba(0,0,0,0.15));
                }
                .container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                }
                .entity-name {
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--primary-text-color);
                    margin-bottom: 4px;
                    text-align: center;
                    line-height: 1.2;
                }
                .switch-container {
                    width: 60px;
                    height: 100px;
                    position: relative;
                    margin: 8px 0;
                }
                .switch-track {
                    width: 100%;
                    height: 100%;
                    border-radius: 10px;
                    background: var(--switch-unchecked-track-color, #e0e0e0);
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                .switch-track.on {
                    background: var(--switch-checked-track-color, #4caf50);
                }
                .switch-thumb {
                    width: 50px;
                    height: 45px;
                    border-radius: 8px;
                    background: #ffffff !important;
                    position: absolute;
                    top: 5px;
                    left: 5px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }
                .switch-thumb.on {
                    transform: translateY(45px);
                    background: #ffffff !important;
                }
                .icon {
                    width: 20px;
                    height: 20px;
                    opacity: 0.7;
                }
                .status-text {
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--primary-text-color);
                    margin-top: 4px;
                    text-align: center;
                }
                .status-text.on {
                    color: var(--switch-checked-track-color, #4caf50);
                }
                .last-changed {
                    font-size: 10px;
                    color: var(--secondary-text-color);
                    margin-top: 2px;
                    text-align: center;
                }
                @media (max-width: 480px) {
                    ha-card {
                        padding: 10px;
                        min-height: 70px;
                    }
                    .switch-container {
                        width: 50px;
                        height: 80px;
                    }
                    .switch-thumb {
                        width: 40px;
                        height: 35px;
                    }
                    .switch-thumb.on {
                        transform: translateY(35px);
                    }
                    .entity-name {
                        font-size: 12px;
                    }
                }
            </style>
            <ha-card id="card">
                <div class="container">
                    <div class="entity-name" id="entityName"></div>
                    <div class="switch-container">
                        <div class="switch-track" id="switchTrack">
                            <div class="switch-thumb" id="switchThumb">
                                <div class="icon" id="icon"></div>
                            </div>
                        </div>
                    </div>
                    <div class="status-text" id="statusText"></div>
                    <div class="last-changed" id="lastChanged"></div>
                </div>
            </ha-card>
        `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const card = this.shadowRoot.getElementById('card');
        let longPressTimer;
        let isLongPress = false;

        const startLongPress = (e) => {
            console.log('Touch/click started');
            isLongPress = false;
            longPressTimer = setTimeout(() => {
                isLongPress = true;
                console.log('Long press detected');
                this.handleLongPress();
            }, 500);
        };

        const cancelLongPress = () => {
            clearTimeout(longPressTimer);
        };

        const handleEnd = (e) => {
            console.log('Touch/click ended, isLongPress:', isLongPress);
            cancelLongPress();
            if (!isLongPress) {
                console.log('Short tap detected, toggling...');
                this.handleToggle();
            }
        };

        // Touch events
        card.addEventListener('touchstart', startLongPress, { passive: true });
        card.addEventListener('touchend', handleEnd, { passive: true });
        card.addEventListener('touchcancel', cancelLongPress, { passive: true });
        card.addEventListener('touchmove', cancelLongPress, { passive: true });

        // Mouse events for desktop
        card.addEventListener('mousedown', startLongPress);
        card.addEventListener('mouseup', handleEnd);
        card.addEventListener('mouseleave', cancelLongPress);
        
        // Fallback click event
        card.addEventListener('click', (e) => {
            console.log('Click event fired as fallback');
            if (!isLongPress) {
                this.handleToggle();
            }
        });
    }

    handleToggle() {
        if (!this._hass || !this.config.entity) return;
        const entityId = this.config.entity;
        const entity = this._hass.states[entityId];
        if (!entity) {
            console.error('Entity not found:', entityId);
            return;
        }
        const domain = entityId.split('.')[0];
        switch (domain) {
            case 'lock':
                if (entity.state === 'locked') {
                    this._hass.callService('lock', 'unlock', { entity_id: entityId });
                } else {
                    this._hass.callService('lock', 'lock', { entity_id: entityId });
                }
                break;
            case 'climate': {
                const onMode = this.config.climate_on_mode || 'heat';
                const offMode = this.config.climate_off_mode || 'off';
                const isOn = entity.state === onMode;
                this._hass.callService('climate', 'set_hvac_mode', {
                    entity_id: entityId,
                    hvac_mode: isOn ? offMode : onMode
                });
                break;
            }
            case 'light':
            case 'switch':
            case 'input_boolean':
            default:
                this._hass.callService('homeassistant', 'toggle', { entity_id: entityId });
                break;
        }
        console.log('Toggle action triggered for:', entityId, 'Current state:', entity.state);
    }

    handleLongPress() {
        if (!this._hass || !this.config.entity) return;
        
        const event = new Event('hass-more-info', {
            bubbles: true,
            composed: true
        });
        event.detail = { entityId: this.config.entity };
        this.dispatchEvent(event);
    }

    updateCard() {
        if (!this._hass || !this.config.entity) return;
        const entityId = this.config.entity;
        const entity = this._hass.states[entityId];
        if (!entity) return;
        const entityName = this.shadowRoot.getElementById('entityName');
        const switchTrack = this.shadowRoot.getElementById('switchTrack');
        const switchThumb = this.shadowRoot.getElementById('switchThumb');
        const statusText = this.shadowRoot.getElementById('statusText');
        const lastChanged = this.shadowRoot.getElementById('lastChanged');
        const icon = this.shadowRoot.getElementById('icon');
        entityName.textContent = this.config.name || entity.attributes.friendly_name || entityId;
        const domain = entityId.split('.')[0];
        let isOn = false;
        // Default colors
        let thumbColor = '#ffffff';
        let trackColor = '#e0e0e0';
        let statusColor = '';
        // Entity/state-specific colors
        if (domain === 'lock') {
            isOn = entity.state === 'locked';
            if (isOn) {
                thumbColor = '#1db954'; // green
                trackColor = '#b7eacb'; // light green
                statusColor = '#1db954';
            } else {
                thumbColor = '#e53935'; // red
                trackColor = '#ffcdd2'; // light red
                statusColor = '#e53935';
            }
        } else if (domain === 'switch') {
            isOn = entity.state === 'on';
            if (isOn) {
                thumbColor = '#ff9800'; // orange
                trackColor = '#ffe0b2'; // light orange
                statusColor = '#ff9800';
            } else {
                thumbColor = '#bdbdbd'; // gray
                trackColor = '#eeeeee'; // light gray
                statusColor = '#757575';
            }
        } else if (domain === 'cover') {
            isOn = entity.state !== 'closed';
            if (!isOn) {
                thumbColor = '#1db954'; // green
                trackColor = '#b7eacb'; // light green
                statusColor = '#1db954';
            } else {
                thumbColor = '#2196f3'; // blue
                trackColor = '#bbdefb'; // light blue
                statusColor = '#2196f3';
            }
        } else if (domain === 'climate') {
            const onMode = this.config.climate_on_mode || 'heat';
            const offMode = this.config.climate_off_mode || 'off';
            isOn = entity.state === onMode;
            if (isOn) {
                thumbColor = '#2196f3'; // blue
                trackColor = '#bbdefb'; // light blue
                statusColor = '#2196f3';
            } else {
                thumbColor = '#bdbdbd'; // gray
                trackColor = '#eeeeee'; // light gray
                statusColor = '#757575';
            }
        } else {
            isOn = entity.state === 'on' || entity.state === 'locked' || entity.state === 'true';
        }
        if (isOn) {
            switchTrack.classList.add('on');
            switchThumb.classList.add('on');
            statusText.classList.add('on');
        } else {
            switchTrack.classList.remove('on');
            switchThumb.classList.remove('on');
            statusText.classList.remove('on');
        }
        switchThumb.style.background = thumbColor;
        switchTrack.style.background = trackColor;
        statusText.style.color = statusColor || '';
        const displayState = entity.state.charAt(0).toUpperCase() + entity.state.slice(1);
        statusText.textContent = displayState;
        // Use Home Assistant icon system
        let entityIcon = this.config.icon || entity.attributes.icon;
        
        // Fallback to default icons if no icon is set
        if (!entityIcon) {
            const domain = entityId.split('.')[0];
            switch (domain) {
                case 'lock':
                    entityIcon = isOn ? 'mdi:lock' : 'mdi:lock-open';
                    break;
                case 'light':
                    entityIcon = 'mdi:lightbulb';
                    break;
                case 'switch':
                    entityIcon = 'mdi:electric-switch';
                    break;
                default:
                    entityIcon = 'mdi:toggle-switch';
            }
        }
        
        // Create ha-icon element
        if (this._hass.hassUrl) {
            icon.innerHTML = `<ha-icon icon="${entityIcon}"></ha-icon>`;
        } else {
            // Fallback for environments without ha-icon
            icon.innerHTML = `<div style="width: 24px; height: 24px; background: currentColor; mask: url('data:image/svg+xml,<svg viewBox="0 0 24 24"><path d="M17,7H22V17H17V19A1,1 0 0,0 18,20H20V22H16A1,1 0 0,1 15,21V19H9V21A1,1 0 0,1 8,22H4V20H6A1,1 0 0,0 7,19V17H2V7H7V5A1,1 0 0,1 8,4H16A1,1 0 0,1 17,5V7Z"/></svg>') center/contain no-repeat;"></div>`;
        }

        // Set last changed time
        if (entity.last_changed) {
            const lastChangedDate = new Date(entity.last_changed);
            const now = new Date();
            const diffMs = now - lastChangedDate;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor(diffMs / (1000 * 60));

            let timeText;
            if (diffHours > 0) {
                timeText = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            } else if (diffMins > 0) {
                timeText = `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
            } else {
                timeText = 'Just now';
            }
            lastChanged.textContent = timeText;
        }
    }

    getCardSize() {
        return 1;
    }
}

customElements.define('large-switch-card', LargeSwitchCard);

// Register the card
window.customCards = window.customCards || [];
window.customCards.push({
    type: 'large-switch-card',
    name: 'Large Switch Card',
    description: 'A large, easy-to-use switch card with better visibility'
});