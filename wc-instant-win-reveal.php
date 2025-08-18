<?php
error_log('Arrr! Plugin file loaded!');
/**
 * Plugin Name: WooCommerce Instant Win Reveal (Endpoint)
 * Description: Runs the Instant Win game as a popup on the Thank You page, with guaranteed JS/CSS loading.
 * Version:     1.5.2
 * Author:      Your Name
 * Text Domain: wc-instant-win
 */

if ( ! defined( 'ABSPATH' ) ) exit;
//update_post_meta( 56476, '_instantwin_precomputed', 1);
class WC_Instant_Win_Reveal {
    public function __construct() {
        add_action( 'woocommerce_checkout_update_order_meta', [ $this, 'mark_instantwin_order' ], 20, 2 );
        add_action( 'woocommerce_payment_complete',           [ $this, 'precompute_instant_win' ], 20 );
        add_action( 'wp_ajax_instantwin_reveal_auto',         [ $this, 'ajax_reveal_auto' ] );
        add_action( 'wp_ajax_nopriv_instantwin_reveal_auto',  [ $this, 'ajax_reveal_auto' ] );
        add_action( 'wp_ajax_instantwin_reveal_finalize',     [ $this, 'ajax_reveal_finalize' ] );
        add_action( 'wp_ajax_nopriv_instantwin_reveal_finalize',[ $this, 'ajax_reveal_finalize' ] );
        add_action( 'wp_ajax_instantwin_get_game_data',       [ $this, 'ajax_get_game_data' ] );
        add_action( 'wp_ajax_nopriv_instantwin_get_game_data', [ $this, 'ajax_get_game_data' ] );
        add_action( 'wp_ajax_instantwin_play_ticket',         [ $this, 'ajax_play_ticket' ] );
        add_action( 'wp_ajax_nopriv_instantwin_play_ticket',  [ $this, 'ajax_play_ticket' ] );
        
        // AJAX endpoints for scratch progress management
        add_action( 'wp_ajax_instantwin_save_scratch_progress',    [ $this, 'ajax_save_scratch_progress' ] );
        add_action( 'wp_ajax_nopriv_instantwin_save_scratch_progress', [ $this, 'ajax_save_scratch_progress' ] );
        
        add_action( 'wp_ajax_instantwin_load_scratch_progress',    [ $this, 'ajax_load_scratch_progress' ] );
        add_action( 'wp_ajax_nopriv_instantwin_load_scratch_progress', [ $this, 'ajax_load_scratch_progress' ] );
        
        add_action( 'wp_ajax_instantwin_clear_scratch_progress',   [ $this, 'ajax_clear_scratch_progress' ] );
        add_action( 'wp_ajax_nopriv_instantwin_clear_scratch_progress', [ $this, 'ajax_clear_scratch_progress' ] );
        
        // AJAX handler to hide game after instant reveal
        add_action( 'wp_ajax_instantwin_hide_game', [ $this, 'ajax_hide_game' ] );
        add_action( 'wp_ajax_nopriv_instantwin_hide_game', [ $this, 'ajax_hide_game' ] );
        
        // AJAX handler to reset game data
        add_action( 'wp_ajax_instantwin_reset_game', [ $this, 'ajax_reset_game' ] );
        add_action( 'wp_ajax_nopriv_instantwin_reset_game', [ $this, 'ajax_reset_game' ] );
        
        add_action( 'd_instantwin_show_ui', [ $this, 'output_reveal_ui' ] );
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets_on_thankyou' ] );
        
        // Auto-reveal cron job setup
        add_action( 'wp_loaded', [ $this, 'setup_auto_reveal_cron' ] );
        add_action( 'instantwin_auto_reveal_cron', [ $this, 'process_auto_reveal_cron' ] );
        add_action( 'instantwin_auto_reveal_cron_test', [ $this, 'process_auto_reveal_cron' ] );
        
        // Add custom cron schedule
        add_filter( 'cron_schedules', [ $this, 'add_custom_cron_schedule' ] );
        
        // Manual trigger for testing
        add_action( 'wp_ajax_instantwin_trigger_auto_reveal', [ $this, 'ajax_trigger_auto_reveal' ] );
        add_action( 'wp_ajax_nopriv_instantwin_trigger_auto_reveal', [ $this, 'ajax_trigger_auto_reveal' ] );
        
        // Get final results for View Results popup
        add_action( 'wp_ajax_instantwin_get_final_results', [ $this, 'ajax_get_final_results' ] );
        add_action( 'wp_ajax_nopriv_instantwin_get_final_results', [ $this, 'ajax_get_final_results' ] );
        
        // Individual product reveal
        add_action( 'wp_ajax_instantwin_reveal_product', [ $this, 'ajax_reveal_product' ] );
        add_action( 'wp_ajax_nopriv_instantwin_reveal_product', [ $this, 'ajax_reveal_product' ] );
        
        // Auto-reveal state management
        add_action( 'wp_ajax_save_auto_reveal_state', [ $this, 'ajax_save_auto_reveal_state' ] );
        add_action( 'wp_ajax_nopriv_save_auto_reveal_state', [ $this, 'ajax_save_auto_reveal_state' ] );
        
        add_action( 'wp_ajax_get_auto_reveal_state', [ $this, 'ajax_get_auto_reveal_state' ] );
        add_action( 'wp_ajax_nopriv_get_auto_reveal_state', [ $this, 'ajax_get_auto_reveal_state' ] );
        
        add_action( 'wp_ajax_get_all_auto_reveal_states', [ $this, 'ajax_get_all_auto_reveal_states' ] );
        add_action( 'wp_ajax_nopriv_get_all_auto_reveal_states', [ $this, 'ajax_get_all_auto_reveal_states' ] );
        
        add_action( 'wp_ajax_clear_auto_reveal_states', [ $this, 'ajax_clear_auto_reveal_states' ] );
        add_action( 'wp_ajax_nopriv_clear_auto_reveal_states', [ $this, 'ajax_clear_auto_reveal_states' ] );
        
        register_activation_hook(   __FILE__, [ $this, 'flush_rewrite_rules_on_activate' ] );
        register_deactivation_hook( __FILE__, [ $this, 'flush_rewrite_rules' ] );
    }

    public function mark_instantwin_order( $order_id, $data ) {
        $order = wc_get_order( $order_id );
        if ( ! $order ) return;
        foreach ( $order->get_items() as $item ) {
            $p = wc_get_product( $item->get_product_id() );
            if ( function_exists('have_rows') && have_rows('instant_tickets_prizes',$p->get_id()) ) {
                update_post_meta( $order_id, '_instantwin_enabled', 1 );
                return;
            }
        }
    }

    public function precompute_instant_win( $order_id ) {
        if ( get_post_meta( $order_id, '_instantwin_precomputed', true ) ) {
            return;
        }
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return;
        }
    
        $sessions = [];
        foreach ( $order->get_items() as $item ) {
            $pid      = $item->get_product_id();
            $product  = wc_get_product( $pid );
            $title    = $product ? $product->get_title() : '';
            $mode     = get_post_meta( $pid, 'instant_win_game_type', true ) ?: 'wheel';
            $mode     = in_array( $mode, ['wheel','slots','scratch'], true ) ? $mode : 'wheel';
    
            // Build wins_map for THIS specific product
            $wins_map = [];
            if ( function_exists( 'have_rows' ) && have_rows( 'instant_tickets_prizes', $pid ) ) {
                foreach ( get_field( 'instant_tickets_prizes', $pid ) as $win ) {
                    foreach ( explode( ',', $win['winning_ticket'] ) as $num ) {
                        $wins_map[ trim( $num ) ] = $win['instant_prize'];
                    }
                }
                error_log("Arrr! Product $pid wins_map: " . print_r($wins_map, true));
            } else {
                error_log("Arrr! Product $pid has no instant_tickets_prizes field!");
            }
            
            foreach ( $item->get_formatted_meta_data() as $meta ) {
                if ( $meta->key !== 'Ticket number' ) {
                    continue;
                }
                $nums = array_map( 'trim', explode( ',', $meta->value ) );
                foreach ( $nums as $n ) {
                    if ( ! $n ) {
                        continue;
                    }
                    if ( ! isset( $sessions[ $pid ] ) ) {
                    $sessions[ $pid ] = [
                        'product_id' => $pid,
                        'title'      => $title,
                        'mode'       => $mode,
                            'tickets'    => [],
                    ];
                    }
                    $ticket_obj = [
                        'number' => $n,
                        'status' => isset( $wins_map[ $n ] ) ? 'WIN' : 'LOSE',
                        'prize'  => $wins_map[ $n ] ?? '',
                    ];
                    $sessions[ $pid ]['tickets'][] = $ticket_obj;
                    error_log("Arrr! Created ticket object for $n: " . print_r($ticket_obj, true));
                }
            }
        }
        $sessions = array_values( $sessions );
        update_post_meta( $order_id, '_instantwin_sessions', wp_json_encode( $sessions ) );
        update_post_meta( $order_id, '_instantwin_precomputed', 1 );
    }
    
    public function ajax_reveal_auto() {
        error_log('Arrr! ajax_reveal_auto called! $_POST: ' . print_r($_POST, true));
        $order_id = isset($_POST['order_id']) ? intval($_POST['order_id']) : (isset($_GET['order_id']) ? intval($_GET['order_id']) : 0);

        // Call process_reveal to send email notifications and update order meta
        $this->process_reveal( $order_id, 'auto' );
    }
    public function ajax_reveal_finalize(){ $this->process_reveal( intval($_POST['order_id']), 'interactive' ); }
    
    // Get fresh reveal data without resetting game state
    private function get_fresh_reveal_data( $order_id ) {
        $debug = [];
        if ( ! $order_id ) {
            wp_send_json_error([
                'msg'   => 'Invalid order.',
                'debug' => ['no order_id passed']
            ]);
        }
        
        $debug[] = "Getting fresh reveal data for order_id={$order_id}";
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            wp_send_json_error([
                'msg'   => 'Order not found.',
                'debug' => $debug
            ]);
        }
        
        $debug[] = 'Order loaded successfully.';
        
        // Get current game sessions (preserve game state)
        $sessions_json = get_post_meta( $order_id, '_instantwin_sessions', true );
        $sessions = $sessions_json ? json_decode( $sessions_json, true ) : [];
        
        // Get fresh prize data from current product configurations
        $wins = [];
        foreach ( $order->get_items() as $item ) {
            $product_id = $item->get_product_id();
            $product = wc_get_product( $product_id );
            
            if ( ! $product || ! function_exists('have_rows') || ! have_rows( 'instant_tickets_prizes', $product_id ) ) {
                continue;
            }
            
            $instantWins = get_field( 'instant_tickets_prizes', $product_id );
            
            // Check each ticket against current winning configurations
            foreach ( $item->get_formatted_meta_data() as $meta ) {
                if ( $meta->key !== 'Ticket number' ) {
                    continue;
                }
                
                $ticket = $meta->value;
                foreach ( $instantWins as $win ) {
                    $winning = array_map( 'trim', explode( ',', $win['winning_ticket'] ) );
                    if ( in_array( $ticket, $winning ) ) {
                        $wins[] = [
                            'product_name' => $product->get_title(),
                            'prize_name' => $win['instant_prize'],
                            'ticket_number' => $ticket
                        ];
                    }
                }
            }
        }
        
        $debug[] = 'Fresh prize data collected. Found ' . count($wins) . ' wins.';
        
        wp_send_json_success([
            'wins' => $wins,
            'debug' => $debug
        ]);
    }

    public function enqueue_assets_on_thankyou() {
        if ( ! function_exists('is_wc_endpoint_url') || !is_wc_endpoint_url('order-received') ) return;
        $order_id = absint( get_query_var('order-received') );
        if ( ! $order_id ) return;
        $order = wc_get_order( $order_id );
        if ( ! $order ) return;
        
        // Check if order has instant games and is precomputed
        $has_instant_games = get_post_meta( $order_id, '_instantwin_enabled', true );
        $is_precomputed = get_post_meta( $order_id, '_instantwin_precomputed', true );
        
        // Only enqueue if order has instant games
        if ( ! $has_instant_games ) return;
        
        // Build tickets per product with precomputed results
        $tickets_per_product = [];
        
        // Load precomputed sessions if available
        $sessions_json = get_post_meta( $order_id, '_instantwin_sessions', true );
        $sessions = $sessions_json ? json_decode( $sessions_json, true ) : [];
        
        foreach ( $order->get_items() as $item ) {
            $pid      = (int) $item->get_product_id();
            $product  = wc_get_product( $pid );
            $title    = $product ? (string) $product->get_title() : '';
            $mode     = (string) (get_post_meta( $pid, 'instant_win_game_type', true ) ?: 'wheel');
            $mode     = in_array( $mode, ['wheel','slots','scratch'], true ) ? $mode : 'wheel';
            
            // Get product image
            $image_id = $product ? $product->get_image_id() : 0;
            $image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'full' ) : '';
            
            // Get background image based on game type
            $background_image = '';
            $background_field = '';
            switch ($mode) {
                case 'wheel':
                    $background_field = 'wheel_game_background';
                    break;
                case 'slots':
                    $background_field = 'slot_game_background';
                    break;
                case 'scratch':
                    $background_field = 'scratch_game_background';
                    break;
            }
            
            if ($background_field) {
                $bg_image = get_post_meta( $pid, $background_field, true );
                error_log("[InstantWin] Product {$pid} - Background field '{$background_field}' raw value: " . print_r($bg_image, true));
                
                if ($bg_image) {
                    if ( is_array( $bg_image ) && isset( $bg_image['url'] ) ) {
                        $background_image = $bg_image['url'];
                    } elseif ( is_string( $bg_image ) && filter_var( $bg_image, FILTER_VALIDATE_URL ) ) {
                        // It's already a valid URL
                        $background_image = $bg_image;
                    } elseif ( is_numeric( $bg_image ) || ( is_string( $bg_image ) && is_numeric( $bg_image ) ) ) {
                        // It's an attachment ID - convert to URL
                        $attachment_url = wp_get_attachment_image_url( intval( $bg_image ), 'full' );
                        if ( $attachment_url ) {
                            $background_image = $attachment_url;
                        }
                    }
                    error_log("[InstantWin] Product {$pid} - Final background image URL: " . $background_image);
                }
            }
            
            // Get product price and quantity
            $price = $product ? $product->get_price() : 0;
            $quantity = $item->get_quantity();
            
            // Find precomputed session for this product
            $product_session = null;
            foreach ( $sessions as $session ) {
                if ( $session['product_id'] == $pid ) {
                    $product_session = $session;
                    break;
                }
            }
            
            $product_tickets = [];
            if ( $product_session && !empty( $product_session['tickets'] ) ) {
                // Use precomputed results
                $product_tickets = $product_session['tickets'];
            } else {
                // Fallback: build from order meta (without results)
                foreach ( $item->get_formatted_meta_data() as $meta ) {
                    if ( $meta->key === 'Ticket number' ) {
                        $nums = array_map( 'trim', explode( ',', $meta->value ) );
                        foreach ( $nums as $n ) {
                            if ( $n ) {
                                $product_tickets[] = [
                                    'number' => (string) $n,
                                    'status' => 'UNKNOWN',
                                    'prize'  => '',
                                ];
                            }
                        }
                    }
                }
            }
            
            if ( !empty( $product_tickets ) ) {
                $tickets_per_product[] = [
                    'product_id'    => $pid,
                    'title'         => $title,
                    'mode'          => $mode,
                    'tickets'       => $product_tickets,
                    'image_url'     => $image_url,
                    'background_image' => $background_image,
                    'price'         => $price,
                    'quantity'      => $quantity,
                    'total_tickets' => count($product_tickets),
                    'currency'      => get_woocommerce_currency_symbol(),
                ];
            }
        }
        
        // Only proceed if we have games to show
        if ( empty( $tickets_per_product ) ) return;
        
        $tickets_per_product = array_map(function($prod) {
            return [
                'product_id'    => (int) $prod['product_id'],
                'title'         => (string) $prod['title'],
                'mode'          => (string) $prod['mode'],
                'tickets'       => array_map(function($ticket) {
                    return [
                        'number' => (string) $ticket['number'],
                        'status' => (string) $ticket['status'],
                        'prize'  => (string) $ticket['prize'],
                    ];
                }, (array) $prod['tickets']),
                'image_url'     => (string) $prod['image_url'],
                'price'         => (float) $prod['price'],
                'quantity'      => (int) $prod['quantity'],
                'total_tickets' => (int) $prod['total_tickets'],
                'currency'      => (string) $prod['currency'],
            ];
        }, $tickets_per_product);
        
        $prizes  = [];
        foreach ( $order->get_items() as $item ) {
            $pid = $item->get_product_id();
            if ( function_exists( 'have_rows' ) && have_rows( 'instant_tickets_prizes', $pid ) ) {
                foreach ( get_field( 'instant_tickets_prizes', $pid ) as $w ) {
                    $prize_name = $w['instant_prize'];
                    $prize_image = '';
                    
                    // Get prize image - prioritize icon_prize, fallback to d_prize_image
                    if ( isset( $w['icon_prize'] ) && !empty( $w['icon_prize'] ) ) {
                        // Use icon_prize if available
                        if ( is_array( $w['icon_prize'] ) && isset( $w['icon_prize']['url'] ) ) {
                            $prize_image = $w['icon_prize']['url'];
                        } elseif ( is_string( $w['icon_prize'] ) ) {
                            $prize_image = $w['icon_prize'];
                        } elseif ( is_numeric( $w['icon_prize'] ) ) {
                            $prize_image = wp_get_attachment_image_url( $w['icon_prize'], 'full' );
                        }
                    } elseif ( isset( $w['d_prize_image'] ) && !empty( $w['d_prize_image'] ) ) {
                        // Fallback to d_prize_image
                        if ( is_array( $w['d_prize_image'] ) && isset( $w['d_prize_image']['url'] ) ) {
                            $prize_image = $w['d_prize_image']['url'];
                        } elseif ( is_string( $w['d_prize_image'] ) ) {
                            $prize_image = $w['d_prize_image'];
                        } elseif ( is_numeric( $w['d_prize_image'] ) ) {
                            $prize_image = wp_get_attachment_image_url( $w['d_prize_image'], 'full' );
                        }
                    }
                    
                    $prizes[] = [
                        'name' => $prize_name,
                        'image' => $prize_image,
                        'wheel_color' => isset($w['wheel_color']) ? $w['wheel_color'] : '#0096ff',
                        'wheel_text_color' => isset($w['wheel_text_color']) ? $w['wheel_text_color'] : '#000'
                    ];
                }
            }
        }
        
        // Remove duplicates based on prize name
        $unique_prizes = [];
        $seen_names = [];
        foreach ( $prizes as $prize ) {
            if ( !in_array( $prize['name'], $seen_names ) ) {
                $unique_prizes[] = $prize;
                $seen_names[] = $prize['name'];
            }
        }
        $prizes = $unique_prizes;
        
        $version = filemtime(plugin_dir_url( __FILE__ ) . 'assets/js/instantwin.js'); 
        
        // Register TweenMax (required by Winwheel.js)
        wp_register_script(
            'tweenmax-js',
            'https://cdnjs.cloudflare.com/ajax/libs/gsap/1.20.4/TweenMax.min.js',
            [],
            '1.20.4',
            true
        );
        
        // Register Winwheel.js library (local file)
        wp_register_script(
            'winwheel-js',
            plugin_dir_url( __FILE__ ) . 'assets/js/Winwheel.min.js',
            ['tweenmax-js'],
            '2.8.0',
            true
        );
        
        // Register Owl Carousel library for scratch slider
        wp_register_script(
            'owl-carousel-js',
            get_site_url() . '/owl.carousel.min.js',
            ['jquery'],
            '2.3.4',
            true
        );
        
        wp_register_script(
            'wc-instantwin-js',
            plugin_dir_url( __FILE__ ) . 'assets/js/instantwin.js',
            [ 'jquery', 'winwheel-js', 'owl-carousel-js' ],
            $version,
            true
        );
        // Register Owl Carousel CSS
        wp_register_style(
            'owl-carousel-css',
            'https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.carousel.min.css',
            [],
            '2.3.4'
        );
        
        wp_register_style(
            'owl-theme-css',
            'https://cdnjs.cloudflare.com/ajax/libs/OwlCarousel2/2.3.4/assets/owl.theme.default.min.css',
            [],
            '2.3.4'
        );
        
        wp_register_style(
            'wc-instantwin-css',
            plugin_dir_url( __FILE__ ) . 'assets/css/instantwin.css',
            ['owl-carousel-css', 'owl-theme-css'],
            '1.5.2'
        );
        wp_localize_script( 'wc-instantwin-js', 'instantWin', [
            'ajax_url'     => admin_url( 'admin-ajax.php' ),
            'order_id'     => $order_id,
            'nonce'        => wp_create_nonce( 'instantwin_' . $order_id ),
            'thankyou_url' => wc_get_checkout_url() . "order-received/{$order_id}/?key={$order->get_order_key()}",
            'has_games'    => true,
            'is_precomputed' => intval($is_precomputed) === 1,
            'plugin_url'   => plugin_dir_url( __FILE__ ),
            // Remove sensitive data - will be fetched securely via AJAX
        ] );
        
        // Add instantWinAjax for auto-reveal functionality
        wp_localize_script( 'wc-instantwin-js', 'instantWinAjax', [
            'ajaxurl' => admin_url( 'admin-ajax.php' ),
            'nonce'   => wp_create_nonce( 'instantwin_nonce' ),
        ] );
        wp_enqueue_script( 'wc-instantwin-js' );
        wp_enqueue_style(  'wc-instantwin-css' );
        
        // Debug: Add var_dump for thank you page
        if (isset($_GET['debug']) && $_GET['debug'] === 'true') {
            echo '<div style="background: #f0f0f0; padding: 20px; margin: 20px; border: 1px solid #ccc;">';
            echo '<h3>PHP Debug Data (Enqueue):</h3>';
            echo '<h4>Order ID:</h4>';
            var_dump($order_id);
            echo '<h4>Product Data:</h4>';
            var_dump($tickets_per_product);
            echo '<h4>Prizes Data:</h4>';
            var_dump($prizes);
            echo '</div>';
        }
    }

    public function output_reveal_ui( $order_id ) {
        echo '<div id="instantwin-choice" class="instantwin-wrap">';
          echo '<div class="instantwin-content">';
            echo '<h3>🎰 Instant Win Game!</h3>';
            echo '<p>Click the button below to reveal your instant win prizes!</p>';
            echo '<button class="reveal-all-btn w-btn us-btn-style_1">🎁 Reveal All Prizes</button>';
          echo '<div id="instantwin-area"></div>';
          echo '<div id="instantwin-wheel-container" class="hidden">';
            echo '<canvas id="instantwin-wheel" width="300" height="300"></canvas>';
            echo '<button id="btnSpin">Spin</button>';
            echo '</div>';
          echo '</div>';
        echo '</div>';
    }

private function process_reveal( $order_id, $mode ) {
    $debug = [];
    if ( ! $order_id ) {
        wp_send_json_error([
            'msg'   => 'Invalid order.',
            'debug' => ['no order_id passed']
        ]);
    }
    $debug[] = "Received order_id={$order_id}, mode={$mode}";
    $order = wc_get_order( $order_id );
    if ( ! $order ) {
        wp_send_json_error([
            'msg'   => 'Order not found.',
            'debug' => $debug
        ]);
    }
    $debug[] = 'Order loaded successfully.';
    if ( get_post_meta( $order_id, '_instantwin_revealed_at', true ) ) {
        $debug[] = 'Already revealed, checking if we need to update revealed products for auto mode.';
        
        // Get current revealed products
        $revealed_products = get_post_meta( $order_id, '_instantwin_revealed_products', true );
        if ( ! is_array( $revealed_products ) ) {
            $revealed_products = [];
        }
        
        // For auto mode (reveal all), ensure ALL products are in the revealed list
        if ( $mode == 'auto' ) {
            $needs_update = false;
            foreach ( $order->get_items() as $item ) {
                $product_id = $item->get_product_id();
                if ( ! in_array( $product_id, $revealed_products ) ) {
                    $revealed_products[] = $product_id;
                    $needs_update = true;
                }
            }
            
            if ( $needs_update ) {
                $revealed_products = array_unique($revealed_products);
                // Ensure it's a proper indexed array, not associative
                $revealed_products = array_values($revealed_products);
                update_post_meta( $order_id, '_instantwin_revealed_products', $revealed_products );
                $debug[] = 'Updated revealed products to include all products: ' . implode(', ', $revealed_products);
            }
        }
        
        wp_send_json_success([
            'already' => true,
            'revealed_products' => $revealed_products,
            'debug'   => $debug
        ]);
    }
    update_post_meta( $order_id, '_instantwin_reveal_mode',  $mode );
    update_post_meta( $order_id, '_instantwin_revealed_at', current_time( 'mysql' ) );
    
    // For auto mode, preserve game data but get fresh prize data for display
    if ( $mode == 'auto' ) {
        // Use the same correct logic as get_fresh_reveal_data
        $wins = [];
        foreach ( $order->get_items() as $item ) {
            $product_id = $item->get_product_id();
            $product = wc_get_product( $product_id );
            
            if ( ! $product || ! function_exists('have_rows') || ! have_rows( 'instant_tickets_prizes', $product_id ) ) {
                continue;
            }
            
            $instantWins = get_field( 'instant_tickets_prizes', $product_id );
            
            // Check each ticket against current winning configurations
            foreach ( $item->get_formatted_meta_data() as $meta ) {
                if ( $meta->key !== 'Ticket number' ) {
                    continue;
                }
                
                $ticket = $meta->value;
                foreach ( $instantWins as $win ) {
                    $winning = array_map( 'trim', explode( ',', $win['winning_ticket'] ) );
                    if ( in_array( $ticket, $winning ) ) {
                        $wins[] = [
                            'product_name' => $product->get_title(),
                            'prize_name' => $win['instant_prize'],
                            'ticket_number' => $ticket
                        ];
                    }
                }
            }
        }
        
        $debug[] = 'Fresh prize data collected. Found ' . count($wins) . ' wins.';
        
        // Update revealed products list for all products in the order (for auto reveal all)
        $revealed_products = get_post_meta( $order_id, '_instantwin_revealed_products', true );
        if ( ! is_array( $revealed_products ) ) {
            $revealed_products = [];
        }
        
        foreach ( $order->get_items() as $item ) {
            $product_id = $item->get_product_id();
            $revealed_products[] = $product_id;
        }
        $revealed_products = array_unique($revealed_products); // Ensure no duplicates
        $revealed_products = array_values($revealed_products); // Ensure proper indexed array
        update_post_meta( $order_id, '_instantwin_revealed_products', $revealed_products );
        $debug[] = 'Updated revealed products: ' . implode(', ', $revealed_products);
        
        // Send email notifications and update order meta
        $this->send_win_notification( $order_id );
        $debug[] = 'Email notifications sent and order meta updated.';
        
        // Mark game as finished/hidden since process_reveal means game is complete
        update_post_meta( $order_id, '_instantwin_game_hidden', '1' );
        $debug[] = 'Game marked as finished/hidden.';
        
        // Save wins data to order meta for "View Results" functionality
        update_post_meta( $order_id, '_instantwin_final_results', $wins );
        $debug[] = 'Saved final results to order meta for View Results popup';
        
        wp_send_json_success([
            'mode'        => $mode,
            'revealed_at' => get_post_meta( $order_id, '_instantwin_revealed_at', true ),
            'wins'        => $wins,
            'revealed_products' => $revealed_products,
            'debug'       => $debug,
        ]);
    } else {
        // For interactive mode, use original logic
        if ( ! get_post_meta( $order_id, '_instantwin_precomputed', true ) ) {
            $this->precompute_instant_win( $order_id );
        }
        
        $debug[] = 'Meta _instantwin_reveal_mode, _instantwin_revealed_at updated. Fresh prize data with new winning tickets generated.';
        $debug[] = 'Calling send_win_notification()';
        $this->send_win_notification( $order_id );
        $debug[] = 'Returned from send_win_notification()';
        $raw     = get_post_meta( $order_id, '_instantwin_tickets', true );
        $tickets = $raw ? json_decode( $raw, true ) : [];
        $debug[] = 'Loaded ' . count( $tickets ) . ' tickets from meta.';
        $debug[] = 'Sending JSON success.';
        wp_send_json_success([
            'mode'        => $mode,
            'revealed_at' => get_post_meta( $order_id, '_instantwin_revealed_at', true ),
            'tickets'     => $tickets,
            'debug'       => $debug,
        ]);
    }
}

public function send_win_notification( $order_id, $specific_product_id = null ) {
    if ( ! $order_id ) {
        return;
    }
    $order = wc_get_order( $order_id );
    if ( ! $order ) {
        return;
    }
    
    // If specific product is provided, only process that product
    // Otherwise, check if already done for all products
    if ( $specific_product_id === null && get_post_meta( $order_id, '_thankyou_action_done', true ) ) {
        return;
    }
      //  update_post_meta( $order_id, '_instantwin_precomputed', 0);
       // $order->update_meta_data( '_instantwin_precomputed', false );

    // Only mark as done if processing all products
    if ( $specific_product_id === null ) {
        $order->update_meta_data( '_thankyou_action_done', true );
        $order->save();
    }
    
    foreach ( $order->get_items() as $item ) {
        $product_id = $item->get_product_id();
        
        // If specific product is provided, only process that product
        if ( $specific_product_id !== null && $product_id != $specific_product_id ) {
            continue;
        }
        
        $product    = wc_get_product( $product_id );
        if ( ! $product || ! function_exists('have_rows') || ! have_rows( 'instant_tickets_prizes', $product_id ) ) {
            continue;
        }
        $instantWins = get_field( 'instant_tickets_prizes', $product_id );
        $wrongAnswer = false;
        foreach ( $item->get_formatted_meta_data() as $meta ) {
            if ( $meta->key === __( 'Answer', 'wc-lottery-pn' )
              && get_option( 'lottery_remove_ticket_wrong_answer', 'no' ) === 'yes'
            ) {
                $correct = array_keys( wc_lottery_pn_get_true_answers( $product_id ) );
                if ( ! in_array( $meta->value, $correct ) ) {
                    $wrongAnswer = true;
                }
            }
        }
        if ( $wrongAnswer ) {
            $order->add_order_note( 'Instant Win skipped – wrong answer.' );
            continue;
        }
        foreach ( $item->get_formatted_meta_data() as $meta ) {
            if ( $meta->key !== 'Ticket number' ) {
                continue;
            }
            $ticket = $meta->value;
            foreach ( $instantWins as $win ) {
                $winning = array_map( 'trim', explode( ',', $win['winning_ticket'] ) );
                if ( in_array( $ticket, $winning ) ) {
                    $admin_message = '<p><strong>Instant Win won: ' . esc_html( $win['instant_prize'] ) . '</strong></p>';
                    $user_message  = '<p><strong>Congratulations! You have won: ' . esc_html( $win['instant_prize'] ) . '</strong></p>';
                    if ( function_exists( 'woo_wallet' ) && $win['credit_wallet_automatically'] ) {
                        $code = sprintf(
                            'Instant Win! %s, Order: %d, Ticket: %s',
                            $win['instant_prize'], $order_id, $ticket
                        );
                        $dup = false;
                        foreach ( get_wallet_transactions( [ 'user_id' => $order->get_user_id() ] ) as $txn ) {
                            if ( $txn->details === $code ) {
                                $dup = true;
                                break;
                            }
                        }
                        if ( ! $dup ) {
                            woo_wallet()->wallet->credit(
                                $order->get_user_id(),
                                (int) $win['win_credit_amount'],
                                $code
                            );
                        }
                        $amount = get_woocommerce_currency_symbol() . $win['win_credit_amount'];
                        $admin_message .= "<p><strong>Credited {$amount} to customer's wallet.</strong></p>";
                        $user_message  .= "<p><strong>We have credited {$amount} to your wallet.</strong></p>";
                    } else {
                        $user_message .= '<p>We will be in touch within 24 hours.</p>';
                    }
                    $admin_message .= '<ul>'
                        . '<li>Competition: ' . esc_html( $product->get_title() ) . '</li>'
                        . '<li>Ticket: '      . esc_html( $ticket )              . '</li>'
                        . '<li>Prize: '       . esc_html( $win['instant_prize'] )  . '</li>'
                        . '<li>Customer: '    . esc_html( $order->get_billing_first_name() . ' ' . $order->get_billing_last_name() ) . '</li>'
                        . '<li>Order #: '     . esc_html( $order_id )             . '</li>'
                        . '<li>Email: '       . esc_html( $order->get_billing_email() ) . '</li>'
                        . '</ul>';
                    $user_message .= '<ul>'
                        . '<li>Ticket: ' . esc_html( $ticket ) . '</li>'
                        . '<li>Prize: '  . esc_html( $win['instant_prize'] ) . '</li>'
                        . '</ul>';
                    $order->add_order_note( $admin_message );
                    $mailer  = WC()->mailer();
                    $wrapped = $mailer->wrap_message( 'New Instant Winner', $admin_message );
                    $html    = ( new WC_Email() )->style_inline( $wrapped );
                    $to      = get_field( 'instant_wins_admin_email_notification', 'options' ) ?: get_bloginfo( 'admin_email' );
                    $mailer->send( $to, "New Instant Winner – Order #{$order_id}", $html, [ 'Content-Type' => 'text/html' ] );
                    $wrapped_u = $mailer->wrap_message( "You're an Instant Winner!", $user_message );
                    $html_u    = ( new WC_Email() )->style_inline( $wrapped_u );
                    $mailer->send( $order->get_billing_email(), "You Won! – Order #{$order_id}", $html_u, [ 'Content-Type' => 'text/html' ] );
                }
            }
        }
    }
}

    // Secure AJAX handler to get game data
    public function ajax_get_game_data() {
        $order_id = intval( $_POST['order_id'] ?? 0 );
        $nonce = sanitize_text_field( $_POST['nonce'] ?? '' );
        
        // Verify nonce for security
        if ( ! wp_verify_nonce( $nonce, 'instantwin_' . $order_id ) ) {
            wp_die( json_encode( [ 'error' => 'Invalid security token' ] ) );
        }
        
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            wp_die( json_encode( [ 'error' => 'Order not found' ] ) );
        }
        
        // Check if order has instant games and is precomputed
        $has_instant_games = get_post_meta( $order_id, '_instantwin_enabled', true );
        $is_precomputed = get_post_meta( $order_id, '_instantwin_precomputed', true );
        
        if ( ! $has_instant_games ) {
            wp_die( json_encode( [ 'error' => 'No instant win games found for this order' ] ) );
        }
        
        // If not precomputed, try to precompute now
        if ( ! $is_precomputed ) {
            $this->precompute_instant_win( $order_id );
            $is_precomputed = get_post_meta( $order_id, '_instantwin_precomputed', true );
        }
        
        if ( ! $is_precomputed ) {
            wp_die( json_encode( [ 'error' => 'No instant win games found for this order' ] ) );
        }
        
        // Load precomputed sessions
        $sessions_json = get_post_meta( $order_id, '_instantwin_sessions', true );
        $sessions = $sessions_json ? json_decode( $sessions_json, true ) : [];
        
        if ( empty( $sessions ) ) {
            wp_die( json_encode( [ 'error' => 'No instant win games found for this order' ] ) );
        }
        
        // Check if game is hidden
        $game_hidden = get_post_meta( $order_id, '_instantwin_game_hidden', true );
        
        // Build tickets per product with precomputed results
        $tickets_per_product = [];
        
        foreach ( $order->get_items() as $item ) {
            $pid = (int) $item->get_product_id();
            $product = wc_get_product( $pid );
            $title = $product ? (string) $product->get_title() : '';
            $mode = (string) (get_post_meta( $pid, 'instant_win_game_type', true ) ?: 'wheel');
            
            $image_id = $product ? $product->get_image_id() : 0;
            $image_url = $image_id ? wp_get_attachment_image_url( $image_id, 'full' ) : '';
            
            // Get background image based on game type
            $background_image = '';
            $background_field = '';
            switch ($mode) {
                case 'wheel':
                    $background_field = 'wheel_game_background';
                    break;
                case 'slots':
                    $background_field = 'slot_game_background';
                    break;
                case 'scratch':
                    $background_field = 'scratch_game_background';
                    break;
            }
            
            if ($background_field) {
                $bg_image = get_post_meta( $pid, $background_field, true );
                
                if ($bg_image) {
                    if ( is_array( $bg_image ) && isset( $bg_image['url'] ) ) {
                        $background_image = $bg_image['url'];
                    } elseif ( is_string( $bg_image ) && filter_var( $bg_image, FILTER_VALIDATE_URL ) ) {
                        $background_image = $bg_image;
                    } elseif ( is_numeric( $bg_image ) || ( is_string( $bg_image ) && is_numeric( $bg_image ) ) ) {
                        $attachment_url = wp_get_attachment_image_url( intval( $bg_image ), 'full' );
                        if ( $attachment_url ) {
                            $background_image = $attachment_url;
                        }
                    }
                }
            }
            
            $price = $product ? $product->get_price() : 0;
            $quantity = $item->get_quantity();
            
            $product_session = null;
            foreach ( $sessions as $session ) {
                if ( $session['product_id'] == $pid ) {
                    $product_session = $session;
                    break;
                }
            }
            
            $product_tickets = [];
            
            // If game is hidden, return empty tickets (remaining = 0)
            if ( $game_hidden ) {
                $product_tickets = [];
            } elseif ( $product_session && isset( $product_session['tickets'] ) ) {
                foreach ( $product_session['tickets'] as $ticket ) {
                    // Only include tickets that haven't been played yet
                    if ( $ticket['status'] !== 'PLAYED' ) {
                        $product_tickets[] = [
                            'number' => (string) $ticket['number'],
                            'status' => $ticket['status'] === 'WIN' ? 'WIN' : 'LOSE',
                            'prize' => (string) ($ticket['prize'] ?? ''),
                        ];
                    }
                }
            }
            
            if ( !empty( $product_tickets ) || $game_hidden ) {
                $tickets_per_product[] = [
                    'product_id' => $pid,
                    'title' => $title,
                    'mode' => $mode,
                    'tickets' => $product_tickets,
                    'image_url' => $image_url,
                    'background_image' => $background_image,
                    'price' => (float) $price,
                    'quantity' => (int) $quantity,
                    'total_tickets' => count($product_tickets),
                    'currency' => get_woocommerce_currency_symbol(),
                ];
            }
        }
        
        // Get prizes with images
        $prizes = [];
        foreach ( $order->get_items() as $item ) {
            $pid = $item->get_product_id();
            if ( function_exists( 'have_rows' ) && have_rows( 'instant_tickets_prizes', $pid ) ) {
                foreach ( get_field( 'instant_tickets_prizes', $pid ) as $w ) {
                    $prize_name = $w['instant_prize'];
                    $prize_image = '';
                    
                    // Get prize image - prioritize icon_prize, fallback to d_prize_image
                    if ( isset( $w['icon_prize'] ) && !empty( $w['icon_prize'] ) ) {
                        if ( is_array( $w['icon_prize'] ) && isset( $w['icon_prize']['url'] ) ) {
                            $prize_image = $w['icon_prize']['url'];
                        } elseif ( is_string( $w['icon_prize'] ) ) {
                            $prize_image = $w['icon_prize'];
                        } elseif ( is_numeric( $w['icon_prize'] ) ) {
                            $prize_image = wp_get_attachment_image_url( $w['icon_prize'], 'full' );
                        }
                    } elseif ( isset( $w['d_prize_image'] ) && !empty( $w['d_prize_image'] ) ) {
                        if ( is_array( $w['d_prize_image'] ) && isset( $w['d_prize_image']['url'] ) ) {
                            $prize_image = $w['d_prize_image']['url'];
                        } elseif ( is_string( $w['d_prize_image'] ) ) {
                            $prize_image = $w['d_prize_image'];
                        } elseif ( is_numeric( $w['d_prize_image'] ) ) {
                            $prize_image = wp_get_attachment_image_url( $w['d_prize_image'], 'full' );
                        }
                    }
                    
                    $prizes[] = [
                        'name' => $prize_name,
                        'image' => $prize_image,
                        'wheel_color' => isset($w['wheel_color']) ? $w['wheel_color'] : '#0096ff'
                    ];
                }
            }
        }
        
        // Remove duplicates based on prize name
        $unique_prizes = [];
        $seen_names = [];
        foreach ( $prizes as $prize ) {
            if ( !in_array( $prize['name'], $seen_names ) ) {
                $unique_prizes[] = $prize;
                $seen_names[] = $prize['name'];
            }
        }
        $prizes = $unique_prizes;
        
        if (empty($tickets_per_product)) {
            wp_die( json_encode( [
                'success' => false,
                'error' => 'No instant win games found for this order'
            ] ) );
        }
        
        // Get revealed products for frontend to show completion status
        $revealed_products = get_post_meta( $order_id, '_instantwin_revealed_products', true );
        if ( ! is_array( $revealed_products ) ) {
            $revealed_products = [];
        }
        
        error_log("[PHP] Final prizes data: " . json_encode($prizes));
        
        // Debug: Add var_dump for thank you page
        if (isset($_GET['debug']) && $_GET['debug'] === 'true') {
            echo '<div style="background: #f0f0f0; padding: 20px; margin: 20px; border: 1px solid #ccc;">';
            echo '<h3>PHP Debug Data:</h3>';
            echo '<h4>Product ID:</h4>';
            var_dump($product_id);
            echo '<h4>Prizes Data:</h4>';
            var_dump($prizes);
            echo '<h4>Tickets Data:</h4>';
            var_dump($tickets_per_product);
            echo '</div>';
        }
        
        wp_die( json_encode( [
            'success' => true,
            'tickets' => $tickets_per_product,
            'prizes' => $prizes,
            'revealed_products' => $revealed_products,
            'nonce' => wp_create_nonce( 'instantwin_' . $order_id )
        ] ) );
    }
    
    // Secure AJAX handler to play a ticket
    public function ajax_play_ticket() {
        $order_id = intval( $_POST['order_id'] ?? 0 );
        $nonce = sanitize_text_field( $_POST['nonce'] ?? '' );
        $product_id = intval( $_POST['product_id'] ?? 0 );
        $ticket_number = sanitize_text_field( $_POST['ticket_number'] ?? '' );
        
        // Verify nonce for security
        if ( ! wp_verify_nonce( $nonce, 'instantwin_' . $order_id ) ) {
            wp_die( json_encode( [ 'error' => 'Invalid security token' ] ) );
        }
        
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            wp_die( json_encode( [ 'error' => 'Order not found' ] ) );
        }
        
        // Get and validate ticket from server-side data
        $sessions_json = get_post_meta( $order_id, '_instantwin_sessions', true );
        $sessions = $sessions_json ? json_decode( $sessions_json, true ) : [];
        
        // Debug: Log what we're looking for
        error_log( "[InstantWin] Looking for product_id: {$product_id} (type: " . gettype($product_id) . ")" );
        error_log( "[InstantWin] Available sessions: " . print_r(array_column($sessions, 'product_id'), true) );
        
        $ticket_found = false;
        $ticket_result = null;
        
        // Use array indices instead of references to avoid corruption
        for ( $i = 0; $i < count($sessions); $i++ ) {
            error_log( "[InstantWin] Checking session product_id: {$sessions[$i]['product_id']} (type: " . gettype($sessions[$i]['product_id']) . ")" );
            if ( $sessions[$i]['product_id'] == $product_id ) {
                error_log( "[InstantWin] ✅ Found matching product session!" );
                error_log( "[InstantWin] Looking for ticket: {$ticket_number}" );
                for ( $j = 0; $j < count($sessions[$i]['tickets']); $j++ ) {
                    if ( $sessions[$i]['tickets'][$j]['number'] == $ticket_number && $sessions[$i]['tickets'][$j]['status'] !== 'PLAYED' ) {
                        error_log( "[InstantWin] ✅ Found ticket {$ticket_number} with status: {$sessions[$i]['tickets'][$j]['status']}" );
                        // Mark ticket as played
                        $sessions[$i]['tickets'][$j]['status'] = 'PLAYED';
                        $ticket_found = true;
                        $ticket_result = [
                            'is_win' => isset($sessions[$i]['tickets'][$j]['prize']) && !empty($sessions[$i]['tickets'][$j]['prize']),
                            'prize' => $sessions[$i]['tickets'][$j]['prize'] ?? '',
                            'original_status' => $sessions[$i]['tickets'][$j]['original_status'] ?? 'LOSE'
                        ];
                        break 2;
                    }
                }
                error_log( "[InstantWin] Ticket search completed. Found: " . ($ticket_found ? 'YES' : 'NO') );
                break;
            }
        }
        
        if ( ! $ticket_found ) {
            wp_die( json_encode( [ 'error' => 'Ticket not found or already played' ] ) );
        }
        
        // Save updated sessions to order meta (persistent across devices)
        error_log( "[InstantWin] Saving sessions data..." );
        error_log( "[InstantWin] Sessions before save: " . print_r(array_column($sessions, 'product_id'), true) );
        update_post_meta( $order_id, '_instantwin_sessions', json_encode( $sessions ) );
        
        // Verify the save worked
        $saved_sessions_json = get_post_meta( $order_id, '_instantwin_sessions', true );
        $saved_sessions = $saved_sessions_json ? json_decode( $saved_sessions_json, true ) : [];
        error_log( "[InstantWin] Sessions after save: " . print_r(array_column($saved_sessions, 'product_id'), true) );
        
        // Also save individual play record for history tracking
        $play_history = get_post_meta( $order_id, '_instantwin_play_history', true ) ?: [];
        $play_history[] = [
            'product_id' => $product_id,
            'ticket_number' => $ticket_number,
            'result' => $ticket_result,
            'timestamp' => current_time( 'mysql' ),
            'user_ip' => $_SERVER['REMOTE_ADDR'] ?? '',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
        ];
        update_post_meta( $order_id, '_instantwin_play_history', $play_history );
        
        // Count remaining tickets for this product
        $remaining_tickets = 0;
        $total_tickets = 0;
        $found_product_for_counting = false;
        
        foreach ( $sessions as $session ) {
            error_log( "[InstantWin] Counting - Checking session product_id: {$session['product_id']} vs target: {$product_id}" );
            if ( $session['product_id'] == $product_id ) {
                $found_product_for_counting = true;
                error_log( "[InstantWin] ✅ Found product session for counting!" );
                foreach ( $session['tickets'] as $ticket ) {
                    $total_tickets++;
                    if ( $ticket['status'] !== 'PLAYED' ) {
                        $remaining_tickets++;
                    }
                }
                break;
            }
        }
        
        if (!$found_product_for_counting) {
            error_log( "[InstantWin] ❌ CRITICAL: Could not find product {$product_id} for counting remaining tickets!" );
            error_log( "[InstantWin] Available products for counting: " . print_r(array_column($sessions, 'product_id'), true) );
        }
        
        // Debug logging
        error_log( "[InstantWin] Product {$product_id}: {$remaining_tickets}/{$total_tickets} tickets remaining after playing ticket {$ticket_number}" );
        
        wp_die( json_encode( [
            'success' => true,
            'result' => $ticket_result,
            'remaining_tickets' => $remaining_tickets,
            'total_plays' => count( $play_history ),
            'debug' => [
                'searched_product_id' => $product_id,
                'searched_ticket' => $ticket_number,
                'ticket_found' => $ticket_found,
                'available_products' => array_column($sessions, 'product_id'),
                'found_product_for_counting' => $found_product_for_counting,
                'total_tickets_counted' => $total_tickets,
                'remaining_tickets_counted' => $remaining_tickets
            ]
        ] ) );
    }

    // AJAX handler to save scratch progress to order meta
    public function ajax_save_scratch_progress() {
        $order_id = intval( $_POST['order_id'] ?? 0 );
        $nonce = sanitize_text_field( $_POST['nonce'] ?? '' );
        $product_id = intval( $_POST['product_id'] ?? 0 );
        $scratch_progress = sanitize_text_field( $_POST['scratch_progress'] ?? '' );
        
        // Verify nonce for security
        if ( ! wp_verify_nonce( $nonce, 'instantwin_' . $order_id ) ) {
            wp_send_json_error( 'Invalid security token' );
            return;
        }
        
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            wp_send_json_error( 'Order not found' );
            return;
        }
        
        // Save scratch progress to order meta with product-specific key
        $meta_key = '_instantwin_scratch_progress_' . $product_id;
        update_post_meta( $order_id, $meta_key, $scratch_progress );
        
        error_log( "[InstantWin] Saved scratch progress for product {$product_id} on order {$order_id}" );
        
        wp_send_json_success( 'Progress saved successfully' );
    }
    
    // AJAX handler to load scratch progress from order meta
    public function ajax_load_scratch_progress() {
        $order_id = intval( $_POST['order_id'] ?? 0 );
        $nonce = sanitize_text_field( $_POST['nonce'] ?? '' );
        $product_id = intval( $_POST['product_id'] ?? 0 );
        
        // Verify nonce for security
        if ( ! wp_verify_nonce( $nonce, 'instantwin_' . $order_id ) ) {
            wp_send_json_error( 'Invalid security token' );
            return;
        }
        
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            wp_send_json_error( 'Order not found' );
            return;
        }
        
        // Load scratch progress from order meta with product-specific key
        $meta_key = '_instantwin_scratch_progress_' . $product_id;
        $scratch_progress = get_post_meta( $order_id, $meta_key, true );
        
        if ( $scratch_progress ) {
            error_log( "[InstantWin] Loaded scratch progress for product {$product_id} on order {$order_id}" );
            wp_send_json_success( [ 'scratch_progress' => $scratch_progress ] );
        } else {
            wp_send_json_error( 'No scratch progress found' );
        }
    }
    
    // AJAX handler to clear scratch progress from order meta
    public function ajax_clear_scratch_progress() {
        $order_id = intval( $_POST['order_id'] ?? 0 );
        $nonce = sanitize_text_field( $_POST['nonce'] ?? '' );
        $product_id = intval( $_POST['product_id'] ?? 0 );
        
        // Verify nonce for security
        if ( ! wp_verify_nonce( $nonce, 'instantwin_' . $order_id ) ) {
            wp_send_json_error( 'Invalid security token' );
            return;
        }
        
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            wp_send_json_error( 'Order not found' );
            return;
        }
        
        // Clear scratch progress from order meta with product-specific key
        $meta_key = '_instantwin_scratch_progress_' . $product_id;
        delete_post_meta( $order_id, $meta_key );
        
        error_log( "[InstantWin] Cleared scratch progress for product {$product_id} on order {$order_id}" );
        
        wp_send_json_success( 'Progress cleared successfully' );
    }

        // AJAX handler to hide game after instant reveal
    public function ajax_hide_game() {
        $order_id = intval( $_POST['order_id'] ?? 0 );
        $nonce = sanitize_text_field( $_POST['nonce'] ?? '' );
        
        // Verify nonce for security
        if ( ! wp_verify_nonce( $nonce, 'instantwin_' . $order_id ) ) {
            wp_send_json_error( 'Invalid security token' );
            return;
        }
        
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            wp_send_json_error( 'Order not found' );
            return;
        }
        
        // Simply set the game as hidden - no data modification needed
        update_post_meta( $order_id, '_instantwin_game_hidden', '1' );
        
        error_log( "[InstantWin] Game hidden for order {$order_id} after instant reveal" );
        
        wp_send_json_success( 'Game hidden successfully' );
    }

    // AJAX handler to reset game data
    public function ajax_reset_game() {
        $order_id = intval( $_POST['order_id'] ?? 0 );
        $nonce = sanitize_text_field( $_POST['nonce'] ?? '' );
        
        // Verify nonce for security
        if ( ! wp_verify_nonce( $nonce, 'instantwin_' . $order_id ) ) {
            wp_send_json_error( 'Invalid security token' );
            return;
        }
        
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            wp_send_json_error( 'Order not found' );
            return;
        }

        // Ensure order is marked as having instant win games
        update_post_meta( $order_id, '_instantwin_enabled', 1 );

        // Only clear game-related data, keep order meta intact
        delete_post_meta( $order_id, '_instantwin_sessions' ); // Clear current game sessions
        delete_post_meta( $order_id, '_instantwin_play_history' ); // Clear play history
        delete_post_meta( $order_id, '_instantwin_game_hidden' ); // Clear game hidden status
        delete_post_meta( $order_id, '_instantwin_precomputed' ); // Clear precomputed flag so it can be regenerated
        delete_post_meta( $order_id, '_instantwin_revealed_at' ); // Clear revealed at flag so game can be revealed again
        delete_post_meta( $order_id, '_instantwin_revealed_products' ); // Clear revealed products so games can be revealed again
        delete_post_meta( $order_id, '_instantwin_final_results' ); // Clear final results so View Results won't show old data
        
        // Clear scratch progress for all products
        foreach ( $order->get_items() as $item ) {
            $product_id = $item->get_product_id();
            delete_post_meta( $order_id, '_instantwin_scratch_progress_' . $product_id );
        }

        // Re-precompute to generate fresh sessions with current product settings
        $this->precompute_instant_win( $order_id );

        error_log( "[InstantWin] Game data reset for order {$order_id} - sessions and play history cleared, re-precomputed" );
        
        wp_send_json_success( 'Game data reset successfully' );
    }
 
    public function flush_rewrite_rules_on_activate() {
        flush_rewrite_rules();
    }
    public function flush_rewrite_rules() {
        flush_rewrite_rules();
    }
    
    /**
     * Add custom cron schedule for every 5 minutes
     */
    public function add_custom_cron_schedule( $schedules ) {
        $schedules['every_5_minutes'] = array(
            'interval' => 36000, // 5 minutes in seconds
            'display'  => 'Every 5 Minutes'
        );
        return $schedules;
    }
    
    /**
     * Setup auto-reveal cron job
     */
    public function setup_auto_reveal_cron() {
        error_log( '[InstantWin] Checking if auto-reveal cron is scheduled...' );
        
        if ( ! wp_next_scheduled( 'instantwin_auto_reveal_cron' ) ) {
            wp_schedule_event( time(), 'hourly', 'instantwin_auto_reveal_cron' );
            error_log( '[InstantWin] Auto-reveal cron job scheduled successfully' );
        } else {
            $next_run = wp_next_scheduled( 'instantwin_auto_reveal_cron' );
            error_log( '[InstantWin] Auto-reveal cron already scheduled for: ' . date('Y-m-d H:i:s', $next_run) );
        }
        
        // Also schedule it to run every 5 minutes for testing
        if ( ! wp_next_scheduled( 'instantwin_auto_reveal_cron_test' ) ) {
            wp_schedule_event( time(), 'every_5_minutes', 'instantwin_auto_reveal_cron_test' );
            error_log( '[InstantWin] Auto-reveal test cron job scheduled (every 5 minutes)' );
        }
    }
    
    /**
     * Process auto-reveal cron job - check for orders that need auto-reveal
     */
    public function process_auto_reveal_cron() {
        error_log( '[InstantWin] Auto-reveal cron job running...' );
        
        // Get orders with instant win games that haven't been revealed yet
        $args = array(
            'post_type' => 'shop_order',
            'post_status' => array('wc-completed', 'wc-processing'),
            'meta_query' => array(
                array(
                    'key' => '_instantwin_enabled',
                    'value' => '1',
                    'compare' => '='
                ),
                array(
                    'key' => '_instantwin_revealed_at',
                    'compare' => 'NOT EXISTS'
                )
            ),
            'date_query' => array(
                array(
                    'column' => 'post_date',
                    'before' => '1 hour ago' // Auto-reveal after 1 hour
                )
            ),
            'posts_per_page' => 50,
            'fields' => 'ids'
        );
        
        $order_ids = get_posts( $args );
        
        if ( empty( $order_ids ) ) {
            error_log( '[InstantWin] No orders found for auto-reveal' );
            return;
        }
        
        error_log( '[InstantWin] Found ' . count( $order_ids ) . ' orders for auto-reveal' );
        
        foreach ( $order_ids as $order_id ) {
            try {
                error_log( '[InstantWin] Processing auto-reveal for order ' . $order_id );
                
                // Call process_reveal with auto mode
                $this->process_reveal( $order_id, 'auto' );
                
                error_log( '[InstantWin] Auto-reveal completed for order ' . $order_id );
                
            } catch ( Exception $e ) {
                error_log( '[InstantWin] Error processing auto-reveal for order ' . $order_id . ': ' . $e->getMessage() );
            }
        }
    }
    
    /**
     * Manual trigger for auto-reveal (for testing)
     */
    public function ajax_trigger_auto_reveal() {
        error_log( '[InstantWin] Manual auto-reveal trigger called' );
        
        // Check if user is admin or has proper permissions
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( 'Insufficient permissions' );
            return;
        }
        
        // Process auto-reveal immediately
        $this->process_auto_reveal_cron();
        
        wp_send_json_success( 'Auto-reveal triggered manually' );
    }
    
    /**
     * Reveal individual product prizes
     */
    public function ajax_get_final_results() {
        $order_id = isset($_POST['order_id']) ? intval($_POST['order_id']) : 0;
        
        if ( ! $order_id ) {
            wp_send_json_error( 'Invalid order ID' );
            return;
        }
        
        // Get final results from order meta
        $final_results = get_post_meta( $order_id, '_instantwin_final_results', true );
        
        if ( ! $final_results ) {
            wp_send_json_error( 'No final results found' );
            return;
        }
        
        wp_send_json_success([
            'final_results' => $final_results
        ]);
    }
    
    public function ajax_reveal_product() {
        $order_id = intval( $_POST['order_id'] ?? 0 );
        $product_id = intval( $_POST['product_id'] ?? 0 );
        $nonce = sanitize_text_field( $_POST['nonce'] ?? '' );
        
        error_log( "[InstantWin] Individual product reveal called for order {$order_id}, product {$product_id}" );
        
        // Verify nonce for security
        if ( ! wp_verify_nonce( $nonce, 'instantwin_' . $order_id ) ) {
            wp_send_json_error( 'Invalid security token' );
            return;
        }
        
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            wp_send_json_error( 'Order not found' );
            return;
        }
        
        $product = wc_get_product( $product_id );
        if ( ! $product ) {
            wp_send_json_error( 'Product not found' );
            return;
        }
        
        // Check if this product has instant win prizes
        if ( ! function_exists('have_rows') || ! have_rows( 'instant_tickets_prizes', $product_id ) ) {
            wp_send_json_error( 'Product has no instant win prizes' );
            return;
        }
        
        // Get wins for this specific product only
        $wins = [];
        $instantWins = get_field( 'instant_tickets_prizes', $product_id );
        
        // Find the order item for this product
        foreach ( $order->get_items() as $item ) {
            if ( $item->get_product_id() == $product_id ) {
                // Check each ticket against current winning configurations
                foreach ( $item->get_formatted_meta_data() as $meta ) {
                    if ( $meta->key !== 'Ticket number' ) {
                        continue;
                    }
                    
                    $ticket = $meta->value;
                    foreach ( $instantWins as $win ) {
                        $winning = array_map( 'trim', explode( ',', $win['winning_ticket'] ) );
                        if ( in_array( $ticket, $winning ) ) {
                            $wins[] = [
                                'product_name' => $product->get_title(),
                                'prize_name' => $win['instant_prize'],
                                'ticket_number' => $ticket
                            ];
                        }
                    }
                }
                break; // Found the product, no need to continue
            }
        }
        
        // Mark this specific product as revealed (prevent duplicates)
        $revealed_products = get_post_meta( $order_id, '_instantwin_revealed_products', true );
        if ( ! is_array( $revealed_products ) ) {
            $revealed_products = [];
        }
        
        // Check if product is already revealed
        if ( in_array( $product_id, $revealed_products ) ) {
            error_log( "[InstantWin] Product {$product_id} already revealed, skipping duplicate reveal" );
            wp_send_json_success([
                'product_id' => $product_id,
                'product_name' => $product->get_title(),
                'wins' => $wins,
                'revealed_products' => $revealed_products,
                'already_revealed' => true
            ]);
            return;
        }
        
        $revealed_products[] = $product_id;
        $revealed_products = array_values($revealed_products); // Ensure proper indexed array
        update_post_meta( $order_id, '_instantwin_revealed_products', $revealed_products );
        
        // Send email notification for this product only
        $this->send_win_notification( $order_id, $product_id );
        
        error_log( "[InstantWin] Product {$product_id} revealed. Found " . count($wins) . " wins." );
        
        wp_send_json_success([
            'product_id' => $product_id,
            'product_name' => $product->get_title(),
            'wins' => $wins,
            'revealed_products' => $revealed_products
        ]);
    }
    
    /**
     * Save auto-reveal state for a specific ticket
     */
    public function ajax_save_auto_reveal_state() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'instantwin_nonce')) {
            wp_send_json_error('Invalid nonce');
            return;
        }
        
        $product_id = intval($_POST['product_id']);
        $ticket_number = sanitize_text_field($_POST['ticket_number']);
        $state = $_POST['state'];
        
        if (!$product_id || !$ticket_number) {
            wp_send_json_error('Invalid product ID or ticket number');
            return;
        }
        
        // Validate state data
        if (!is_array($state) || !isset($state['revealed'])) {
            wp_send_json_error('Invalid state data');
            return;
        }
        
        // Store in WordPress options (more secure than user meta)
        $option_key = "auto_reveal_state_{$product_id}_{$ticket_number}";
        $state_data = array(
            'revealed' => boolval($state['revealed']),
            'isWin' => boolval($state['isWin']),
            'prize' => sanitize_text_field($state['prize']),
            'timestamp' => intval($state['timestamp']),
            'user_id' => get_current_user_id(),
            'ip_address' => $this->get_client_ip()
        );
        
        update_option($option_key, $state_data);
        
        wp_send_json_success('Auto-reveal state saved');
    }
    
    /**
     * Get auto-reveal state for a specific ticket
     */
    public function ajax_get_auto_reveal_state() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'instantwin_nonce')) {
            wp_send_json_error('Invalid nonce');
            return;
        }
        
        $product_id = intval($_POST['product_id']);
        $ticket_number = sanitize_text_field($_POST['ticket_number']);
        
        if (!$product_id || !$ticket_number) {
            wp_send_json_error('Invalid product ID or ticket number');
            return;
        }
        
        $option_key = "auto_reveal_state_{$product_id}_{$ticket_number}";
        $state = get_option($option_key, null);
        
        if ($state) {
            wp_send_json_success($state);
        } else {
            wp_send_json_error('No state found');
        }
    }
    
    /**
     * Get all auto-reveal states for a product
     */
    public function ajax_get_all_auto_reveal_states() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'instantwin_nonce')) {
            wp_send_json_error('Invalid nonce');
            return;
        }
        
        $product_id = intval($_POST['product_id']);
        
        if (!$product_id) {
            wp_send_json_error('Invalid product ID');
            return;
        }
        
        global $wpdb;
        
        // Get all auto-reveal states for this product
        $option_name = "auto_reveal_state_{$product_id}_%";
        $states = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT option_name, option_value FROM {$wpdb->options} 
                 WHERE option_name LIKE %s",
                $option_name
            ),
            ARRAY_A
        );
        
        $result = array();
        foreach ($states as $row) {
            $ticket_number = str_replace("auto_reveal_state_{$product_id}_", "", $row['option_name']);
            $state = maybe_unserialize($row['option_value']);
            if ($state && is_array($state) && isset($state['revealed']) && $state['revealed']) {
                $result[$ticket_number] = $state;
            }
        }
        
        wp_send_json_success($result);
    }
    
    /**
     * Clear all auto-reveal states for a product
     */
    public function ajax_clear_auto_reveal_states() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'instantwin_nonce')) {
            wp_send_json_error('Invalid nonce');
            return;
        }
        
        $product_id = intval($_POST['product_id']);
        
        if (!$product_id) {
            wp_send_json_error('Invalid product ID');
            return;
        }
        
        global $wpdb;
        
        // Delete all auto-reveal states for this product
        $option_name = "auto_reveal_state_{$product_id}_%";
        $deleted = $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
                $option_name
            )
        );
        
        wp_send_json_success("Cleared {$deleted} auto-reveal states");
    }
    
    /**
     * Get client IP address
     */
    private function get_client_ip() {
        $ip_keys = array('HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR');
        foreach ($ip_keys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }
        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
    
}

new WC_Instant_Win_Reveal();

