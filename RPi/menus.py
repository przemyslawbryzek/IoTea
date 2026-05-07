import logging
import threading
import socket
import time

logger = logging.getLogger(__name__)


class MenuManager:
    """Manages menu navigation and manual brew parameter input"""
    
    def __init__(self, config_manager, brew_manager, screen_manager, input_provider=None, on_ble_pairing=None):
        self.config_manager = config_manager
        self.brew_manager = brew_manager
        self.screen_manager = screen_manager
        self.input_provider = input_provider
        self.on_ble_pairing = on_ble_pairing
        self.running = True
        
        self._menu_mode = None
        self._menu_items = []
        self._menu_index = 0
        self._selected_tea = None
        

        self._last_brew = None
        self._can_continue_brew = False
        
        self._manual_brew_mode = None
        self._manual_brew_params = {}
        
        self._viewing_config = False
        self._viewing_config_time = 0
        
        self._input_thread = threading.Thread(target=self._input_listener, daemon=True)
        self._input_thread.start()

    def _input_listener(self):
        """Background thread listening for local control input (LEFT, RIGHT, ACK)."""
        while self.running:
            try:
                if not self.input_provider:
                    time.sleep(0.2)
                    continue

                user_input = self.input_provider.read_event(timeout=0.2)
                if not user_input:
                    continue

                self._handle_input(user_input)
            except Exception as e:
                logger.debug(f"Input listener error: {e}")

    def _handle_input(self, user_input):
        if self._manual_brew_mode:
            if user_input == 'LEFT':
                if self._manual_brew_mode == 'volume':
                    self._manual_brew_params['volume_ml'] = max(0, self._manual_brew_params['volume_ml'] - 50)
                elif self._manual_brew_mode == 'temperature':
                    self._manual_brew_params['temperature_c'] = max(40, self._manual_brew_params['temperature_c'] - 5)
                elif self._manual_brew_mode == 'duration':
                    self._manual_brew_params['duration_seconds'] = max(30, self._manual_brew_params['duration_seconds'] - 10)
                self._update_manual_brew_display()
            elif user_input == 'RIGHT':
                if self._manual_brew_mode == 'volume':
                    self._manual_brew_params['volume_ml'] = min(1000, self._manual_brew_params['volume_ml'] + 50)
                elif self._manual_brew_mode == 'temperature':
                    self._manual_brew_params['temperature_c'] = min(100, self._manual_brew_params['temperature_c'] + 5)
                elif self._manual_brew_mode == 'duration':
                    self._manual_brew_params['duration_seconds'] = min(3600, self._manual_brew_params['duration_seconds'] + 10)
                self._update_manual_brew_display()
            elif user_input == 'ACK':
                if self._manual_brew_mode == 'volume':
                    self._manual_brew_mode = 'temperature'
                    self._update_manual_brew_display()
                elif self._manual_brew_mode == 'temperature':
                    self._manual_brew_mode = 'duration'
                    self._update_manual_brew_display()
                elif self._manual_brew_mode == 'duration':
                    self._start_manual_brew()
                    self._manual_brew_mode = None
                    self.open_main_menu()
            return

        if user_input == 'LEFT':
            if self._menu_items:
                if self._menu_index == 0:
                    self._menu_index = len(self._menu_items) - 1
                else:
                    self._menu_index -= 1
            logger.debug(f"LEFT pressed - menu index: {self._menu_index}")
        elif user_input == 'RIGHT':
            if self._menu_items:
                if self._menu_index == len(self._menu_items) - 1:
                    self._menu_index = 0
                else:
                    self._menu_index += 1
            logger.debug(f"RIGHT pressed - menu index: {self._menu_index}")
        elif user_input == 'ACK':
            logger.info("ACK pressed - confirming selection")
            if self._menu_mode == 'main' and self._menu_items:
                selected_action = self._menu_items[self._menu_index]
                self._handle_main_menu_selection(selected_action)
            elif self._menu_mode == 'tea_selection' and self._menu_items:
                selected_item = self._menu_items[self._menu_index]
                if selected_item.get('is_back'):
                    logger.info("BACK selected - returning to main menu")
                    self.open_main_menu()
                else:
                    self._selected_tea = selected_item
                    self._menu_mode = 'style_selection'
                    self._menu_index = 0
                    self._load_styles_for_tea()
            elif self._menu_mode == 'style_selection' and self._menu_items:
                selected_item = self._menu_items[self._menu_index]
                if selected_item.get('is_back'):
                    logger.info("BACK selected - returning to tea selection")
                    self._menu_mode = 'tea_selection'
                    self._menu_index = 0
                    self._load_teas_for_menu()
                elif self._selected_tea:
                    style = selected_item
                    self._start_brew_with_selection(self._selected_tea, style)
                    self.open_main_menu()
            elif self._viewing_config:
                logger.info("ACK while viewing config - returning to main menu")
                self._viewing_config = False
                self.screen_manager.clear_custom_message()
                self.open_main_menu()
            elif self._menu_mode == 'settings' and self._menu_items:
                selected_item = self._menu_items[self._menu_index]
                if selected_item.get('is_back'):
                    logger.info("BACK selected - returning to main menu")
                    self.open_main_menu()
                else:
                    self._handle_settings_selection(selected_item)
            elif not self._menu_mode and not self._manual_brew_mode:
                logger.info("ACK pressed in OPERATIONAL mode - opening main menu")
                self.open_main_menu()

    def _load_teas_for_menu(self):
        """Load tea list for menu"""
        try:
            teas = self.config_manager.get_all_teas()
            teas_with_back = teas + [{'name': '<- BACK', 'category': '', 'is_back': True}]
            self._menu_items = teas_with_back
            self._menu_index = 0
            self.screen_manager.set_menu('tea_selection', teas_with_back, 0)
            logger.info(f"Loaded {len(teas)} teas for menu (with BACK)")
        except Exception as e:
            logger.error(f"Error loading teas: {e}")
            self._menu_mode = 'main'
            self.open_main_menu()

    def _load_styles_for_tea(self):
        """Load brewing styles for selected tea"""
        try:
            if self._selected_tea:
                styles = self.config_manager.get_tea_instructions(self._selected_tea['id'])
                styles_with_back = styles + [{'style': '<- BACK', 'is_back': True}]
                self._menu_items = styles_with_back
                self._menu_index = 0
                self.screen_manager.set_menu('style_selection', styles_with_back, 0)
                logger.info(f"Loaded {len(styles)} styles for {self._selected_tea['name']} (with BACK)")
        except Exception as e:
            logger.error(f"Error loading styles: {e}")
            self._menu_mode = 'tea_selection'

    def _start_brew_with_selection(self, tea, style):
        """Start brewing with selected tea and style"""
        try:
            if self.brew_manager:
                logger.info(f"Starting brew: {tea['name']} - {style['style']}")
                result = self.brew_manager.start_local_brew(tea, style)
                if result:
                    self.screen_manager.set_brewing(True, 0)
                    self._last_brew = {
                        'tea_id': tea['id'],
                        'tea_name': tea['name'],
                        'style': style['style'],
                        'brew_number': 1,
                        'max_infusions': style.get('max_infusions', 1),
                        'increment_seconds': style.get('increment_seconds', 0)
                    }
                    self._check_can_continue_brew()
                    logger.info("Brew started successfully")
                else:
                    logger.error("Failed to start brew")
        except Exception as e:
            logger.error(f"Error starting brew: {e}")
    
    def _start_continue_brew(self):
        """Start next infusion of previous brew"""
        if not self._last_brew or not self.brew_manager:
            return False
        
        try:
            brew = self._last_brew
            next_brew_number = brew['brew_number'] + 1
            
            if next_brew_number > brew['max_infusions']:
                logger.warning("Cannot continue - max infusions reached")
                return False
            
            if 'first_infusion_seconds' not in brew:
                logger.error(f"Invalid brew data: missing first_infusion_seconds")
                return False
            
            duration = brew['first_infusion_seconds'] if next_brew_number == 1 else brew['first_infusion_seconds'] + (brew['increment_seconds'] * (next_brew_number - 1))
            
            style = {
                'id': self._last_brew.get('instructions_id'),
                'style': f"{brew['style']} #{next_brew_number}",
                'first_infusion_seconds': duration,
                'increment_seconds': brew['increment_seconds'],
                'max_infusions': brew['max_infusions'],
                'grams_per_100ml': brew.get('grams_per_100ml', 0)
            }
            
            self._last_brew['brew_number'] = next_brew_number
            self._check_can_continue_brew()
            
            logger.info(f"Starting brew infusion #{next_brew_number}")
            if self.brew_manager.start_local_brew({'id': brew['tea_id'], 'name': brew['tea_name']}, style):
                self.screen_manager.set_brewing(True, 0)
                return True
            else:
                logger.error("Failed to start continued brew")
                return False
        except Exception as e:
            logger.error(f"Error continuing brew: {e}", exc_info=True)
            return False
    
    def _check_can_continue_brew(self):
        """Check if current brew can be continued (has next infusion)"""
        if not self._last_brew:
            self._can_continue_brew = False
            return
        
        brew = self._last_brew
        next_brew_number = brew['brew_number'] + 1
        self._can_continue_brew = next_brew_number <= brew['max_infusions']

    def _update_manual_brew_display(self):
        """Update screen with current manual brew parameter"""
        if self._manual_brew_mode == 'volume':
            msg = f"Volume (ml): {self._manual_brew_params['volume_ml']}"
        elif self._manual_brew_mode == 'temperature':
            msg = f"Temperature (°C): {self._manual_brew_params['temperature_c']}"
        elif self._manual_brew_mode == 'duration':
            msg = f"Duration (s): {self._manual_brew_params['duration_seconds']}"
        else:
            msg = "Manual Brew Setup"
        self.screen_manager.set_custom_message(msg)
        logger.debug(f"Manual brew: {msg}")

    def _start_manual_brew(self):
        """Start manual brew with user-defined parameters"""
        try:
            if not self.brew_manager:
                logger.error("Brew manager not initialized")
                return False
            
            vol = self._manual_brew_params.get('volume_ml', 200)
            temp = self._manual_brew_params.get('temperature_c', 75)
            duration = self._manual_brew_params.get('duration_seconds', 60)
            
            if not (0 <= vol <= 1000) or not (40 <= temp <= 100) or not (30 <= duration <= 3600):
                logger.error(f"Invalid manual brew params: {vol}ml @ {temp}°C for {duration}s")
                return False
            
            logger.info(f"Starting manual brew: {vol}ml @ {temp}°C for {duration}s")
            
            tea = {'id': 0, 'name': 'Manual Brew'}
            style = {
                'id': 0,
                'style': 'Manual',
                'first_infusion_seconds': duration,
                'max_infusions': 1,
                'increment_seconds': 0,
                'grams_per_100ml': 0,
                'temperature_c': temp,
                'volume_ml': vol
            }
            
            result = self.brew_manager.start_local_brew(tea, style)
            if result:
                self.screen_manager.set_brewing(True, 0)
                self._last_brew = {
                    'tea_id': 0,
                    'tea_name': 'Manual',
                    'style': f'{vol}ml @ {temp}°C',
                    'brew_number': 1,
                    'max_infusions': 1,
                    'increment_seconds': 0,
                    'first_infusion_seconds': duration
                }
                self._check_can_continue_brew()
                logger.info("Manual brew started successfully")
                return True
            else:
                logger.error("Failed to start manual brew")
                return False
        except Exception as e:
            logger.error(f"Error starting manual brew: {e}", exc_info=True)
            return False

    def open_main_menu(self):
        """Open main menu with Custom Brew, Manual Brew, Settings, Continue Brew"""
        menu_items = [
            {'name': 'Brew', 'action': 'brew'},
            {'name': 'Manual Brew', 'action': 'manual_brew'},
            {'name': 'Settings', 'action': 'settings'},
        ]
        if self._can_continue_brew:
            menu_items.append({'name': 'Continue Brew', 'action': 'continue_brew'})
        
        self._menu_mode = 'main'
        self._menu_items = menu_items
        self._menu_index = 0
        self.screen_manager.set_menu('main', menu_items, 0)
        logger.info(f"Opened main menu with {len(menu_items)} options")

    def _handle_main_menu_selection(self, action_item):
        """Handle main menu selection"""
        action = action_item.get('action')
        logger.info(f"Main menu: {action}")
        
        if action == 'brew':
            logger.info("Starting brew - tea selection")
            self._menu_mode = 'tea_selection'
            self._load_teas_for_menu()
        elif action == 'manual_brew':
            logger.info("Starting manual brew - entering parameters")
            self._menu_mode = None
            with self.screen_manager.lock:
                self.screen_manager.menu_mode = None
            self._manual_brew_mode = 'volume'
            self._manual_brew_params = {'volume_ml': 200, 'temperature_c': 75, 'duration_seconds': 60}
            logger.info(f"Manual brew mode set to: {self._manual_brew_mode}")
            self._update_manual_brew_display()
            logger.info(f"Custom message set, manual_brew_mode: {self._manual_brew_mode}")
        elif action == 'settings':
            logger.info("Opening settings menu")
            self._menu_mode = 'settings'
            self._load_settings_menu()
        elif action == 'continue_brew':
            if self._last_brew and self._can_continue_brew:
                logger.info(f"Continuing brew")
                self._start_continue_brew()

    def get_menu_state(self):
        """Get current menu state"""
        return {
            'menu_mode': self._menu_mode,
            'menu_items': self._menu_items,
            'menu_index': self._menu_index,
        }

    def is_manual_brew_active(self):
        """Check if manual brew mode is active"""
        return self._manual_brew_mode is not None

    def set_menu_display(self):
        """Update screen with current menu state"""
        if self._menu_mode:
            self.screen_manager.set_menu(self._menu_mode, self._menu_items, self._menu_index)

    def shutdown(self):
        """Shutdown menu manager"""
        self.running = False

    def _load_settings_menu(self):
        """Load settings menu options"""
        settings_items = [
            {'name': 'View Config', 'action': 'view_config'},
            {'name': 'BLE Server', 'action': 'ble_pairing'},
            {'name': '<- BACK', 'action': 'back', 'is_back': True}
        ]
        self._menu_items = settings_items
        self._menu_index = 0
        self.screen_manager.set_menu('settings', settings_items, 0)
        logger.info("Settings menu loaded")

    def _handle_settings_selection(self, action_item):
        """Handle settings menu selection"""
        action = action_item.get('action')
        logger.info(f"Settings: {action}")
        
        if action == 'view_config':
            logger.info("Viewing configuration...")
            self._show_config_info()
        elif action == 'ble_pairing':
            logger.info("Starting BLE server from settings")
            if self.on_ble_pairing:
                self.on_ble_pairing()
            else:
                logger.warning("No BLE pairing callback defined")
                self.screen_manager.set_custom_message("BLE unavailable")
        elif action == 'back':
            logger.info("Returning to main menu")
            self.open_main_menu()
    
    def _get_device_ip(self):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.connect(("8.8.8.8", 80))
            ip = sock.getsockname()[0]
            sock.close()
            return ip
        except Exception:
            return "localhost"
    
    def _show_config_info(self):
        """Display device configuration info (IP and device ID)"""
        try:
            device_ip = self._get_device_ip()
            device_id = self.config_manager.get_config('device_id', 'Not configured')
            
            config_text = f"Device Info\nIP: {device_ip}\nID: {device_id}"
            self.screen_manager.set_custom_message(config_text)
            self._viewing_config = True
            logger.info(f"Displaying config: IP={device_ip}, ID={device_id}")
        except Exception as e:
            logger.error(f"Error retrieving config: {e}")
            self._viewing_config = True
            self.screen_manager.set_custom_message("Error loading config")
            
