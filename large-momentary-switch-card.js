class LargeMomentarySwitchCard extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error('You need to define an entity');
        }
        this.config = config;
        this.render();
    }

    set hass(hass) {
        this._hass = hass;
        if (this.config) {
            this.updateCard();
        }
    }

    render() {
        // Support both 'color' and 'track_color' config keys for backward compatibility
        const trackColor = this.config.color || this.config.track_color || '#b7eacb';
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
                    transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
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
                ha-card.active {
                    background: #b7eacb !important;
                    box-shadow: 0 4px 16px rgba(76,175,80,0.15);
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
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .switch-track {
                    width: 100%;
                    height: 100%;
                    border-radius: 10px;
                    background: ${trackColor};
                    transition: background 0.3s;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .switch-thumb {
                    width: 50px;
                    height: 45px;
                    border-radius: 8px;
                    background: #ffffff !important;
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    transition: background 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }
                .icon {
                    color: #404040;
                    width: 20px;
                    height: 20px;
                    opacity: 0.7;
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
                    <div class="last-changed" id="lastChanged"></div>
                </div>
            </ha-card>
        `;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const card = this.shadowRoot.getElementById('card');
        let isActive = false;
        const activate = () => {
            isActive = true;
            card.classList.add('active');
        };
        const deactivate = () => {
            if (isActive) {
                card.classList.remove('active');
                isActive = false;
            }
        };
        const triggerAction = () => {
            this.handleMomentaryAction();
        };
        // Touch events
        card.addEventListener('touchstart', (e) => { activate(); }, { passive: true });
        card.addEventListener('touchend', (e) => { deactivate(); triggerAction(); }, { passive: true });
        card.addEventListener('touchcancel', deactivate, { passive: true });
        card.addEventListener('touchmove', deactivate, { passive: true });
        // Mouse events
        card.addEventListener('mousedown', activate);
        card.addEventListener('mouseup', (e) => { deactivate(); triggerAction(); });
        card.addEventListener('mouseleave', deactivate);
        // Fallback click
        card.addEventListener('click', (e) => { triggerAction(); });
    }

    handleMomentaryAction() {
        if (!this._hass || !this.config.entity) return;
        const entityId = this.config.entity;
        const domain = entityId.split('.')[0];
        if (domain === 'scene') {
            this._hass.callService('scene', 'turn_on', { entity_id: entityId });
        } else if (domain === 'script') {
            this._hass.callService('script', 'turn_on', { entity_id: entityId });
        } else {
            // fallback: try homeassistant.toggle
            this._hass.callService('homeassistant', 'toggle', { entity_id: entityId });
        }
    }

    updateCard() {
        if (!this._hass || !this.config.entity) return;
        const entityId = this.config.entity;
        const entity = this._hass.states[entityId];
        if (!entity) return;
        const entityName = this.shadowRoot.getElementById('entityName');
        const lastChanged = this.shadowRoot.getElementById('lastChanged');
        const icon = this.shadowRoot.getElementById('icon');
        entityName.textContent = this.config.name || entity.attributes.friendly_name || entityId;
        // Icon
        let entityIcon = this.config.icon || entity.attributes.icon;
        if (!entityIcon) {
            const domain = entityId.split('.')[0];
            switch (domain) {
                case 'scene':
                    entityIcon = 'mdi:palette';
                    break;
                case 'script':
                    entityIcon = 'mdi:script-text-outline';
                    break;
                default:
                    entityIcon = 'mdi:gesture-tap-button';
            }
        }
        if (this._hass.hassUrl) {
            icon.innerHTML = `<ha-icon icon="${entityIcon}"></ha-icon>`;
        } else {
            icon.innerHTML = `<div style="width: 24px; height: 24px; background: currentColor; mask: url('data:image/svg+xml,<svg viewBox=\"0 0 24 24\"><path d=\"M17,7H22V17H17V19A1,1 0 0,0 18,20H20V22H16A1,1 0 0,1 15,21V19H9V21A1,1 0 0,1 8,22H4V20H6A1,1 0 0,0 7,19V17H2V7H7V5A1,1 0 0,1 8,4H16A1,1 0 0,1 17,5V7Z"/></svg>') center/contain no-repeat;"></div>`;
        }
        // Last changed
        if (entity.last_changed) {
            const lastChangedDate = new Date(entity.last_changed);
            const now = new Date();
            const diffMs = now - lastChangedDate;
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor(diffMs / (1000 * 60));
            let timeText;
            if (diffHours > 0) {
                timeText = `${diffHours} hour${diffHours !== 1 ? 's' : ''}<br>ago`;
            } else if (diffMins > 0) {
                timeText = `${diffMins} min${diffMins !== 1 ? 's' : ''}<br>ago`;
            } else {
                timeText = 'Just<br>now';
            }
            lastChanged.innerHTML = timeText;
        }
    }

    getCardSize() {
        return 1;
    }
}

customElements.define('large-momentary-switch-card', LargeMomentarySwitchCard);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'large-momentary-switch-card',
    name: 'Large Momentary Switch Card',
    description: 'A large, easy-to-use momentary switch card for scenes and scripts.'
});
