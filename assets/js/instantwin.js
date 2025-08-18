jQuery(document).ready(function($) {
  console.log('[InstantWin JS] Loaded - Secure version v3.0 - Server tracking active!');
  
  let products = [];
  let allPrizes = [];
  let currentProductIdx = 0;
  let currentProduct = null;
  let wheelInstance = null;
  let playHistory = [];
  
  // Audio functionality for scratch sound - declare early
  let scratchAudio = null;
  let scratchAudioLoaded = false;
  let scratchAudioFailed = false;
  let audioContext = null;
  
  // Preload scratch sound on page load
  console.log('[Audio] Preloading scratch sound...');
  initScratchSound();
  
  // Sound system
  const gameSounds = {
    spinning: null,
    winning: null,
    
    init: function() {
      try {
        const spinningUrl = instantWin.plugin_url + '/assets/sound/spin.mp3';
        const winningUrl = instantWin.plugin_url + '/assets/sound/win.wav';
        
        console.log('[Sounds] Initializing sound system...');
        console.log('[Sounds] Spinning sound URL:', spinningUrl);
        console.log('[Sounds] Winning sound URL:', winningUrl);
        
        this.spinning = new Audio(spinningUrl);
        this.winning = new Audio(winningUrl);
        this.spinning.loop = true;
        this.spinning.volume = 0.6;
        this.winning.volume = 0.8;
        
        // Preload sounds
        this.spinning.load();
        this.winning.load();
        
        console.log('[Sounds] Sound system initialized successfully');
        console.log('[Sounds] Spinning audio object:', this.spinning);
        console.log('[Sounds] Winning audio object:', this.winning);
        
        // Test sound loading
        this.spinning.addEventListener('canplaythrough', () => {
          console.log('[Sounds] Spinning sound loaded successfully');
        });
        this.winning.addEventListener('canplaythrough', () => {
          console.log('[Sounds] Winning sound loaded successfully');
        });
        
        this.spinning.addEventListener('error', (e) => {
          console.error('[Sounds] Error loading spinning sound:', e);
        });
        this.winning.addEventListener('error', (e) => {
          console.error('[Sounds] Error loading winning sound:', e);
        });
        
      } catch (error) {
        console.warn('[Sounds] Could not initialize sounds:', error);
      }
    },
    
    playSpinning: function() {
      console.log('[Sounds] Attempting to play spinning sound...');
      // Enable sounds if not already enabled (user interaction from clicking play button)
      if (!soundsEnabled) {
        console.log('[Sounds] Enabling sounds due to play button interaction...');
        soundsEnabled = true;
      }
      if (this.spinning) {
        console.log('[Sounds] Spinning audio object found:', this.spinning);
        try {
          this.spinning.currentTime = 0;
          console.log('[Sounds] Set currentTime to 0, attempting to play spinning...');
          this.spinning.play().then(() => {
            console.log('[Sounds] Spinning sound started playing successfully');
          }).catch(e => {
            console.warn('[Sounds] Could not play spinning sound:', e);
            console.warn('[Sounds] Error details:', e.message);
          });
        } catch (error) {
          console.warn('[Sounds] Error playing spinning sound:', error);
        }
      } else {
        console.warn('[Sounds] Spinning audio object is null/undefined');
      }
    },
    
    stopSpinning: function() {
      if (this.spinning) {
        try {
          this.spinning.pause();
          this.spinning.currentTime = 0;
        } catch (error) {
          console.warn('[Sounds] Error stopping spinning sound:', error);
        }
      }
    },
    
    playWinning: function() {
      console.log('[Sounds] Attempting to play winning sound...');
      // Enable sounds if not already enabled (user interaction from clicking play button)
      if (!soundsEnabled) {
        console.log('[Sounds] Enabling sounds due to play button interaction...');
        soundsEnabled = true;
      }
      
      try {
        // Create a new Audio instance for each win to allow multiple simultaneous plays
        const winningUrl = instantWin.plugin_url + '/assets/sound/win.wav';
        const winSound = new Audio(winningUrl);
        winSound.volume = 0.8;
        
        console.log('[Sounds] Created new winning audio instance');
        winSound.play().then(() => {
            console.log('[Sounds] Winning sound started playing successfully');
          }).catch(e => {
            console.warn('[Sounds] Could not play winning sound:', e);
            console.warn('[Sounds] Error details:', e.message);
          });
        } catch (error) {
          console.warn('[Sounds] Error playing winning sound:', error);
      }
    }
  };
  
  // Check if we have games and should initialize
  if (!instantWin.has_games) {
    console.log('[InstantWin] No games found for this order');
    return;
  }
  
  const $gameLobby = $('#instantwin-game-lobby');
  const $area = $('#instantwin-area'); // Fallback for game play
  
  // Show loading state in game lobby
  $gameLobby.html(`
    <div class="game-lobby-loading">
      <div class="spinner"></div>
      <p>Loading your games...</p>
    </div>
  `);
  
  // Initialize sound system
  gameSounds.init();
  
  // Enable sounds after user interaction (browser autoplay policy)
  let soundsEnabled = false;
  $(document).on('click', function() {
    if (!soundsEnabled) {
      console.log('[Sounds] User interaction detected, enabling sounds...');
      soundsEnabled = true;
      // Try to play a silent sound to unlock audio context
      if (gameSounds.spinning) {
        gameSounds.spinning.play().then(() => {
          gameSounds.spinning.pause();
          gameSounds.spinning.currentTime = 0;
          console.log('[Sounds] Audio context unlocked successfully');
        }).catch(e => {
          console.warn('[Sounds] Could not unlock audio context:', e);
        });
      }
    }
  });
  

  
  // Entry point: Load game data and initialize Game Lobby
  
  // Always add test button first, regardless of data loading
      addTestButton(); // Add refresh data button
      addAutoRevealTestButton(); // Add auto-reveal test button
  
  loadGameDataSecurely().then(function() {
    console.log('[Security] Game data loaded securely from server');
    console.log('[Security] Products loaded:', products.length);
    
    // Show actual ticket counts from server
    products.forEach(function(product, idx) {
      console.log('[Security] Product', idx + 1, ':', product.title, '- Tickets remaining:', product.tickets.length);
    });
    
    // Initialize Game Lobby only if there are products
    if (products.length > 0) {
    showGameLobby();
    } else {
      // Hide the entire game lobby page on thank you page if no products
      $('.game-lobby-page').hide();
      console.log('[UI] No products found - hiding entire game lobby page on thank you page');
    }
    
    // Add functionality for the instant reveal trigger (using event delegation for dynamic buttons)
    $(document).off('click', '.instant-reveal-trigger').on('click', '.instant-reveal-trigger', function(e) {
      e.preventDefault();
      
      const $btn = $(this);
      const buttonText = $btn.text().trim();
      
      console.log('[Game] Instant reveal trigger clicked, button text:', buttonText);
      
      // If button says "View Results", show the results popup instead of revealing
      if (buttonText === 'View Results') {
        console.log('[Game] View Results clicked - loading final results from server');
        
        // Load final results from order meta
        $.post(instantWin.ajax_url, {
          action: 'instantwin_get_final_results',
          order_id: instantWin.order_id,
          nonce: instantWin.nonce
        })
        .done(function(res) {
          console.log('[Game] Final results response:', res);
          if (res && res.success && res.data && res.data.final_results !== undefined) {
            // Format the final results for the popup
            const finalResults = res.data.final_results;
            let winsData = [];
            
            // Always process finalResults, even if empty (empty means all loses)
            if (finalResults && Array.isArray(finalResults)) {
              winsData = finalResults.map(win => ({
                name: win.product_name || 'Unknown Product',
                prizes: [{
                  name: win.prize_name || 'Unknown Prize',
                  ticket: win.ticket_number || 'Unknown'
                }]
              }));
            }
            // Note: If finalResults is empty array, it means all games were loses
            // showWinPopup will handle empty winsData correctly by showing lose popup
            
            console.log('[Game] Showing View Results popup with data:', winsData);
            showWinPopup(winsData);
          } else {
            console.log('[Game] No final results found, showing lose popup');
            // Fallback if no results found - show lose popup
            showWinPopup([]);
          }
        })
        .fail(function(xhr, status, err) {
          console.error('[Game] Error loading final results:', status, err);
          // Fallback on error - show lose popup
          showWinPopup([]);
        });
        
        return;
      }
      
      // Disable button immediately to prevent multiple clicks
      $btn.prop('disabled', true).text('Processing...');
      
      // Check if we're in the lobby (reveal all) or in a game (reveal individual)
      // We're in a game if the specific game container is visible, otherwise we're in lobby
      const $gameLobby = $('.game-lobby-page');
      const $gameContainer = $gameLobby.parent().find('#instantwin-game-area');
      const isInGame = $gameContainer.is(':visible');
      const isInLobby = !isInGame;
      
      console.log('[Debug] Game container (#instantwin-game-area) visible:', isInGame);
      console.log('[Debug] Game lobby (.game-lobby-page) visible:', $gameLobby.is(':visible'));
      console.log('[Debug] isInLobby:', isInLobby);
      console.log('[Debug] currentProductIdx:', currentProductIdx);
      
      if (isInLobby) {
        // In lobby: reveal all games
        console.log('[Game] In lobby - revealing all games');
        callInstantRevealAllFunction();
      } else {
        // In individual game: reveal only current game
        console.log('[Game] In individual game - revealing current game only');
        
        // Get current product ID from the game context
        const currentProductId = currentProductIdx !== undefined && products[currentProductIdx] 
          ? products[currentProductIdx].product_id 
          : null;
        
        if (!currentProductId) {
          console.error('[Game] No current product ID found');
          alert('Error: Could not identify current game');
          $btn.prop('disabled', false).text('Instant Reveal');
          return;
        }
        
        console.log('[Game] Revealing product:', currentProductId);
        
        // Proceed with reveal for current product only
        $.post(instantWin.ajax_url, {
          action: 'instantwin_reveal_product',
          order_id: instantWin.order_id,
          product_id: currentProductId,
          nonce: instantWin.nonce
        })
        .done(function(res) {
          console.log('[InstantWin] product reveal response:', res);
          if (res && res.success) {
            // Process the reveal results and show appropriate messages
            processInstantRevealResults(res);
          } else {
            const msg = res && res.data && res.data.msg
              ? res.data.msg
              : 'Error processing reveal';
            alert('Error: ' + msg);
            $btn.prop('disabled', false).text('Instant Reveal');
          }
        })
        .fail(function(xhr, status, err) {
          console.error('[InstantWin] AJAX error:', status, err);
          alert('Network error. Please try again.');
          $btn.prop('disabled', false).text('Instant Reveal');
        });
      }
    });
    
  }).catch(function(error) {
    console.error('[Security] Failed to load secure game data:', error);
    $gameLobby.html('<div class="error">Failed to load game data. Please refresh the page.</div>');
  });
  
  // Debug: Check if instant reveal button exists
  setTimeout(() => {
    const buttonCount = $('.instant-reveal-trigger').length;
    console.log('[Debug] Found', buttonCount, 'instant reveal buttons on page');
    if (buttonCount === 0) {
      console.log('[Debug] No instant reveal buttons found!');
    }
  }, 2000);
  
  // Secure function to load game data from server
  function loadGameDataSecurely() {
    console.log('[Security] Loading game data securely from server...');
    return $.ajax({
      url: instantWin.ajax_url,
      type: 'POST',
      data: {
        action: 'instantwin_get_game_data',
        order_id: instantWin.order_id,
        nonce: instantWin.nonce
      },
      dataType: 'json'
    }).done(function(response) {
      if (response.success) {
        products = response.tickets || [];
        allPrizes = response.prizes || [];
        const revealedProducts = response.revealed_products || [];
        
        // Update nonce from response for future requests
        if (response.nonce) {
          instantWin.nonce = response.nonce;
        }
        
        console.log('[Security] Game data loaded securely:', products.length, 'products,', allPrizes.length, 'prizes');
        console.log('[Security] Revealed products:', revealedProducts);
        
        // Store revealed products globally for use in UI
        window.lastRevealedProducts = revealedProducts;
        
        // Mark revealed products as completed
        if (revealedProducts.length > 0) {
          revealedProducts.forEach(productId => {
            const productIndex = products.findIndex(p => p.product_id == productId);
            if (productIndex !== -1) {
              console.log('[Security] Marking product as completed:', products[productIndex].title);
            }
          });
        }
        
        // Auto-reveal is now handled by PHP cron job instead of JavaScript
      } else {
        console.error('[Security] Failed to load game data:', response.error);
        $gameLobby.html('<div class="error">Security error: ' + (response.error || 'Unknown error') + '</div>');
      }
    }).fail(function(xhr, status, error) {
      console.error('[Security] AJAX error loading game data:', error);
      $gameLobby.html('<div class="error">Failed to load game data. Please refresh the page.</div>');
    });
  }
  

  
  // Secure function to play a ticket
  function playTicketSecurely(productId, ticketNumber) {
    console.log('[Security] Playing ticket securely:', ticketNumber, 'for product:', productId);
    return $.ajax({
      url: instantWin.ajax_url,
      type: 'POST',
      data: {
        action: 'instantwin_play_ticket',
        order_id: instantWin.order_id,
        product_id: productId,
        ticket_number: ticketNumber,
        nonce: instantWin.nonce
      },
      dataType: 'json'
    });
  }
  
  function saveGameState() {
    const gameState = {
      currentProductIdx: currentProductIdx,
      playHistory: playHistory,
      products: products,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('instantwin_game_' + instantWin.order_id, JSON.stringify(gameState));
  }
  
  function loadGameState() {
    const saved = localStorage.getItem('instantwin_game_' + instantWin.order_id);
    if (saved) {
      try {
        const gameState = JSON.parse(saved);
        currentProductIdx = gameState.currentProductIdx || 0;
        playHistory = gameState.playHistory || [];
        console.log('[Game] Loaded saved state:', playHistory.length, 'plays in history');
        return true;
      } catch (e) {
        console.warn('[Game] Could not parse saved state:', e);
      }
    }
    return false;
  }
  
  // Add product thumbnail to game canvas
  function addProductThumbnail() {
    if (currentProduct && currentProduct.image_url) {
      const thumbnailHTML = `
        <div class="product-thumbnail">
          <img src="${currentProduct.image_url}" alt="${currentProduct.title}" />
        </div>
      `;
      $('#instantwin-game-canvas').append(thumbnailHTML);
      console.log('[Game] Added product thumbnail:', currentProduct.image_url);
    }
  }

  // Show Game Lobby in the dedicated container
  function showGameLobby() {
    console.log('[UI] showGameLobby() called with', products.length, 'products');
    
    // Get the game lobby element
    const $gameLobby = $('#instantwin-game-lobby');
    if ($gameLobby.length === 0) {
      console.error('[UI] Game lobby element #instantwin-game-lobby not found!');
      return;
    }
    
    // Get revealed products from the last server response
    let revealedProducts = window.lastRevealedProducts || [];
    
    // Ensure revealedProducts is always an array (handle object case)
    if (typeof revealedProducts === 'object' && !Array.isArray(revealedProducts)) {
      revealedProducts = Object.values(revealedProducts);
      console.log('[UI] Converted revealed products object to array:', revealedProducts);
    }
    console.log('[UI] Revealed products:', revealedProducts);
    
    let html = `
      <div class="instantwin-lobby">
        <div class="products-grid">
    `;
    
    products.forEach((product, idx) => {
      const originalRemaining = product.tickets ? product.tickets.length : 0;
      const gameIcon = '🎮';
      // Check if product is revealed (handle both string and number IDs)
      const isRevealed = revealedProducts.includes(product.product_id) || 
                        revealedProducts.includes(String(product.product_id)) ||
                        revealedProducts.includes(parseInt(product.product_id));
      
      // For revealed games, show 0 remaining tickets
      const remaining = isRevealed ? 0 : originalRemaining;
      
      console.log('[UI] Product', idx, ':', product.title, '- Mode:', product.mode, '- Remaining:', remaining, '- Revealed:', isRevealed);
      
      // Determine button text and class based on revealed status
      const buttonText = isRevealed ? '✅ Completed' : `${gameIcon} Play Now`;
      const buttonClass = isRevealed ? 'select-product-btn w-btn us-btn-style_1 completed-btn' : 'select-product-btn w-btn us-btn-style_1';
      const cardClass = isRevealed ? 'product-card game-completed' : 'product-card';
      const playsText = isRevealed ? '' : `Plays left: ${remaining}`;
      
      html += `
        <div class="${cardClass}" data-idx="${idx}">
          ${product.image_url ? `
            <div class="product-image">
              <img src="${product.image_url}" alt="${product.title}" />
            </div>
          ` : ''}
          <div class="product-info">
            <h3>${product.title}</h3>
            <div class="game-plays">${playsText}</div>
          </div>
          <button class="${buttonClass}" ${isRevealed ? 'disabled' : ''}>${buttonText}</button>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
    
    console.log('[UI] Setting Game Lobby HTML');
    $gameLobby.html(html);
    
    // Debug: Check visibility after setting HTML
    console.log('[Debug] $gameLobby element:', $gameLobby.length);
    console.log('[Debug] $gameLobby is visible:', $gameLobby.is(':visible'));
    console.log('[Debug] $gameLobby display:', $gameLobby.css('display'));
    console.log('[Debug] .game-lobby-page is visible:', $('.game-lobby-page').is(':visible'));
    console.log('[Debug] #instantwin-game-area is visible:', $('#instantwin-game-area').is(':visible'));
    
    // Just ensure lobby elements are visible (containers should already be hidden by closeWinPopup)
    console.log('[Debug] showGameLobby called - checking container status');
    const $container = $gameLobby.parent().find('#instantwin-game-area');
    console.log('[Debug] Game container visible in showGameLobby:', $container.is(':visible'));
    
    // Ensure game lobby is visible
    $gameLobby.show();
    $('.game-lobby-page').show();
    console.log('[Debug] Game lobby shown - now visible:', $gameLobby.is(':visible'));
    
    console.log('[Debug] After explicit show - $gameLobby visible:', $gameLobby.is(':visible'));
    console.log('[Debug] After explicit show - .game-lobby-page visible:', $('.game-lobby-page').is(':visible'));
    
    // Additional debug for game content elements
    console.log('[Debug] Total #instantwin-game-area elements:', $('#instantwin-game-area').length);
    console.log('[Debug] Total #instantwin-game-canvas elements:', $('#instantwin-game-canvas').length);
    console.log('[Debug] Total .wheel-container elements:', $('.wheel-container').length);
    console.log('[Debug] Total .slots-container elements:', $('.slots-container').length);
    console.log('[Debug] Total .scratch-card-large elements:', $('.scratch-card-large').length);
    
    $('#instantwin-game-area').each(function(index) {
      console.log('[Debug] #instantwin-game-area', index, 'visible:', $(this).is(':visible'));
      console.log('[Debug] #instantwin-game-area', index, 'display:', $(this).css('display'));
      console.log('[Debug] #instantwin-game-area', index, 'height:', $(this).height());
    });
    
    // Add hover effects
    $('.product-card').hover(
      function() {
        $(this).addClass('hovered');
      },
      function() {
        $(this).removeClass('hovered');
      }
    );
    
    // Make entire product card clickable (only for non-completed games)
    $('.product-card:not(.game-completed)').on('click', function() {
      currentProductIdx = parseInt($(this).data('idx'));
      showPlayScreen();
    });
    
    $('.select-product-btn:not(.completed-btn)').on('click', function(e) {
      e.stopPropagation(); // Prevent double-triggering from card click
      currentProductIdx = parseInt($(this).closest('.product-card').data('idx'));
      showPlayScreen();
    });
    
    // Add click prevention for completed games
    $('.product-card.game-completed, .select-product-btn.completed-btn').on('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('[UI] Clicked on completed game - action prevented');
      return false;
    });
  }
  
  function showPlayScreen() {
    currentProduct = products[currentProductIdx];
    if (!currentProduct) {
      showGameLobby();
      return;
    }
    
    // Check if this game is already completed
    const revealedProducts = window.lastRevealedProducts || [];
    if (revealedProducts.includes(currentProduct.product_id)) {
      console.log('[UI] Attempted to play completed game:', currentProduct.title);
      alert('This game has already been completed! 🎉');
      return;
    }
    
    // Hide game lobby and show game directly in current container
    $gameLobby.hide();
    
    // Use the existing game area container instead of creating modal
    let $container = $gameLobby.parent().find('#instantwin-game-area');
    if ($container.length === 0) {
      // Fallback: create game container if not found
      $gameLobby.after('<div id="instantwin-game-area" class="instantwin-play-container"></div>');
      $container = $('#instantwin-game-area');
    } else {
      $container.empty().removeClass().addClass('instantwin-play-container');
    }
    
    // Show the game container
    $container.show();
    
    // Add Back to Lobby button to the top of game-lobby-header
    const $existingHeader = $('.game-lobby-header');
    if ($existingHeader.length > 0) {
      // Check if back button already exists
      if ($existingHeader.find('.back-to-lobby-top').length === 0) {
                  const backBtnTop = $('<button class="back-to-lobby-top w-btn us-btn-style_1">← Back to Lobby</button>');
        backBtnTop.on('click', function() {
      $container.hide();
      $gameLobby.show();
      
      // Restore original header text
        $existingHeader.find('h6').text('Order confirmed');
        $existingHeader.find('h3').html("You've unlocked Instant Games 🎰 <span>Choose a game below:</span>");
          
          // Remove the back button from header
          $existingHeader.find('.back-to-lobby-top').remove();
      
      // Refresh the lobby to show updated ticket counts
      showGameLobby();
    });
    
        // Make header relative positioned and add back button
        $existingHeader.css('position', 'relative').prepend(backBtnTop);
      }
    }
    
    // No instant reveal button in individual games - only use the one in game-lobby-header
    
    // Update the existing game lobby header instead of creating a new one
    const gameIcon = currentProduct.mode === 'wheel' ? '🎡' : (currentProduct.mode === 'slots' ? '🎰' : '🎫');
    
    // Find and update the existing header
    const $gameHeader = $('.game-lobby-header');
    if ($gameHeader.length > 0) {
      $gameHeader.find('h6').text(currentProduct.title);
      $gameHeader.find('h3').html(`You are playing instant ${currentProduct.mode} ${gameIcon}`);
    }
    
    // Game Canvas Container
    const gameCanvas = $('<div id="instantwin-game-canvas"></div>');
    $container.append(gameCanvas);
    
    // Setup game based on mode
    console.log('[Game] Setting up', currentProduct.mode, 'game');
    if (currentProduct.mode === 'wheel') {
      setupWheelGame();
    } else if (currentProduct.mode === 'slots') {
      setupSlotsGame();
    } else if (currentProduct.mode === 'scratch') {
      setupScratchGame();
    }
  }
  
  function setupWheelGame() {
    console.log('[Game] Setting up wheel game');
    
    // Remove any old canvas and create professional wheel container
    $('#instantwin-game-canvas').empty();
    
    // Apply background image if available
    console.log('[Game] Current product background_image:', currentProduct.background_image);
    if (currentProduct.background_image && currentProduct.background_image.trim() !== '') {
      // Validate that it's a proper URL
      if (currentProduct.background_image.startsWith('http') || currentProduct.background_image.startsWith('/')) {
        $('#instantwin-game-canvas').css({
          'background-image': 'url(' + JSON.stringify(currentProduct.background_image) + ')',
          'background-size': 'cover',
          'background-position': 'center',
          'background-repeat': 'no-repeat'
        });
        console.log('[Game] Applied wheel background:', currentProduct.background_image);
      } else {
        console.warn('[Game] Invalid background image URL:', currentProduct.background_image);
        $('#instantwin-game-canvas').css('background-image', '');
      }
    } else {
      console.log('[Game] No background image available');
      $('#instantwin-game-canvas').css('background-image', '');
    }
    const canvasId = 'instantwin-wheel-canvas';
    const pointerId = 'instantwin-wheel-pointer';
    $('#instantwin-game-canvas').append(`
      <div class="wheel-container" style="position:relative;max-width:400px;margin:0 auto;">
        <canvas id="${canvasId}" width="400" height="400" aria-label="Prize Wheel"></canvas>
        <div id="${pointerId}" style="position:absolute;top:12px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:16px solid #e74c3c;z-index:2;"></div>
        <div class="wheel-center-knob" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:35px;height:35px;background:radial-gradient(circle, #f8f9fa, #e9ecef);border:2px solid #dee2e6;border-radius:50%;z-index:3;box-shadow:0 2px 8px rgba(0,0,0,0.2);"></div>
      </div>
    `);
    
    // Check if Winwheel is available
    if (typeof Winwheel === 'undefined') {
      $('#instantwin-game-canvas').html('<p style="color:red;">Winwheel library not loaded!</p>');
      return;
    }
    
    // Check if TweenMax is available
    if (typeof TweenMax === 'undefined') {
      $('#instantwin-game-canvas').html('<p style="color:red;">TweenMax library not loaded!</p>');
      return;
    }
    
    // Build segments alternating between prizes and X (only one X)
    const allSegments = [];
    const maxSegments = allPrizes.length + 1; // All prizes + 1 X
    
    for (let i = 0; i < maxSegments; i++) {
      if (i < allPrizes.length) {
        // Prize segment
        const prize = allPrizes[i];
        let prizeText = typeof prize === 'string' ? prize : (prize.name || 'Prize');
        
        // Debug: Log prize data
        console.log('[Wheel] Prize data:', prize);
        console.log('[Wheel] Prize wheel_color:', prize.wheel_color);
        
        // Extract only the monetary value (e.g., "Golden Palm - £1000" becomes "£1000")
        if (prizeText.includes('£')) {
          const match = prizeText.match(/£[\d,]+/);
          if (match) {
            prizeText = match[0];
          }
        }
        
        const fillColor = prize.wheel_color || '#0096ff';
        console.log('[Wheel] Using fill color:', fillColor);
        
        allSegments.push({
          'fillStyle': fillColor,
          'text': prizeText,
          'textFillStyle': '#000',
          'textFontSize': 18,
          'strokeStyle': '#ffffff',
          'lineWidth': 3
        });
      } else {
        // Only one X segment
        allSegments.push({
          'fillStyle': '#ffcccc',
          'text': 'X',
          'textFillStyle': '#666',
          'textFontSize': 20,
          'strokeStyle': '#ffffff',
          'lineWidth': 3
        });
      }
    }
    
    console.log('[Game] Creating wheel with', allSegments.length, 'segments');
    
    wheelInstance = new Winwheel({
      'canvasId': canvasId,
      'numSegments': allSegments.length,
      'segments': allSegments,
      'animation': {
        'type': 'spinToStop',
        'duration': 5.5, // Longer duration for smoother feel
        'spins': 4, // More spins for more dramatic effect
        'easing': 'Cubic.easeOut', // Smooth easing function
        'callbackBefore': function() {
          // console.log('[Wheel] Animation starting');
        },
        'callbackAfter': function(indicatedSegment) {
          // console.log('[Wheel] Animation finished');
        },
        'callbackSound': function() {
          // console.log('[Wheel] Sound callback');
        }
      },
      'pointerAngle': 0
    });
    
    window._pirateWheel = wheelInstance;
    console.log('[Game] Wheel created successfully with', wheelInstance.numSegments, 'segments');
    
    // Spins remaining counter above spin button
    const spinsRemaining = $(`<div class="plays-left">spins remaining: ${currentProduct.tickets.length}</div>`);
    $('#instantwin-game-canvas').append(spinsRemaining);
    
    // Spin button with theme classes
    const spinBtn = $('<button id="instantwin-play-btn" class="w-btn us-btn-style_1" style="margin-top:10px;">Spin</button>');
    spinBtn.prop('disabled', currentProduct.tickets.length === 0);
    
    spinBtn.on('click', function() {
      console.log('[Game] Spin button clicked, tickets left:', currentProduct.tickets.length);
      
      if (currentProduct.tickets.length === 0) {
        console.log('No more plays left!');
        return;
      }
      
      // Get next ticket but validate on server
      const nextTicket = currentProduct.tickets[0];
      if (!nextTicket) {
        console.error('[Security] No tickets available');
        return;
      }
      
      console.log('[Security] Playing ticket on server:', nextTicket.number);
      $(this).prop('disabled', true).text('🔒 Validating...');
      
      // Play ticket securely on server - this updates _instantwin_play_history
      playTicketSecurely(currentProduct.product_id, nextTicket.number)
        .done(function(response) {
          if (response.success) {
            console.log('[Security] Server validated ticket play:', response);
            
            // Debug: Show server debug data
            if (response.debug) {
              console.log('[🔍 SERVER DEBUG] Searched product ID:', response.debug.searched_product_id);
              console.log('[🔍 SERVER DEBUG] Searched ticket:', response.debug.searched_ticket);
              console.log('[🔍 SERVER DEBUG] Ticket found:', response.debug.ticket_found);
              console.log('[🔍 SERVER DEBUG] Available products:', response.debug.available_products);
              console.log('[🔍 SERVER DEBUG] Found product for counting:', response.debug.found_product_for_counting);
              console.log('[🔍 SERVER DEBUG] Total tickets counted:', response.debug.total_tickets_counted);
              console.log('[🔍 SERVER DEBUG] Remaining tickets counted:', response.debug.remaining_tickets_counted);
            }
            
            // Debug: Check counts before updating
            console.log('[Debug] Before update - Client tickets:', currentProduct.tickets.length);
            console.log('[Debug] Server says remaining:', response.remaining_tickets);
            
            // Update spins remaining with server-confirmed count FIRST
            $('.plays-left').text('spins remaining: ' + response.remaining_tickets);
            console.log('[Security] Server confirms', response.remaining_tickets, 'tickets remaining');
            
            // Then remove played ticket from client array to keep them in sync
            currentProduct.tickets.shift();
            console.log('[Debug] After shift - Client tickets:', currentProduct.tickets.length);
            
            // Use server result for wheel
            const serverResult = response.result;
            const isWin = serverResult.is_win;
            const prize = serverResult.prize || '';
            const targetPrize = isWin ? prize : 'X';
            console.log('[Security] Server result - Win:', isWin, 'Prize:', prize, 'Target:', targetPrize);
            
            // Add to history as "spinning"
            playHistory.push({
              product: currentProduct.title,
              mode: currentProduct.mode,
              ticket: nextTicket.number,
              result: 'spinning',
              prize: '',
              time: new Date().toISOString(),
              endTime: null
            });
            
            saveGameState();
            
            // Start wheel spin with server result
            startWheelSpin(targetPrize, nextTicket, response);
            
          } else {
            console.error('[Security] Server rejected ticket play:', response.error);
            $(this).prop('disabled', false).text('Spin');
            console.log('Error: ' + (response.error || 'Ticket validation failed'));
          }
        })
        .fail(function(xhr, status, error) {
          console.error('[Security] Server error playing ticket:', error);
          $(this).prop('disabled', false).text('Spin');
          console.log('Network error. Please try again.');
        });
    });
    
    // Add spin button below the wheel
    $('#instantwin-game-canvas').append(spinBtn);
    
    // Add product thumbnail
    addProductThumbnail();
    
    // Add test buttons for each segment
    addWheelTestButtons();
  }
  
  function addWheelTestButtons() {
    console.log('[Test] Adding wheel test buttons');
    
    const testContainer = $('<div class="wheel-test-buttons" style="margin-top:20px;text-align:center;padding:15px;background:#f8f9fa;border-radius:8px;border:2px dashed #dee2e6;">');
    testContainer.append('<h4 style="margin:0 0 15px 0;color:#6c757d;font-size:14px;">🧪 Test Buttons (Debug Mode)</h4>');
    
    const buttonsRow = $('<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">');
    
    // Add X (LOSE) test button
    const loseBtn = $('<button class="test-btn" style="padding:8px 12px;font-size:12px;border:1px solid #dc3545;background:#dc3545;color:white;border-radius:4px;cursor:pointer;">X (LOSE)</button>');
    loseBtn.click(() => testWheelResult('X'));
    buttonsRow.append(loseBtn);
    
    // Add test buttons for each prize
    if (allPrizes && allPrizes.length > 0) {
      allPrizes.forEach((prize, index) => {
        const prizeName = typeof prize === 'string' ? prize : (prize.name || 'Prize');
        const shortName = prizeName.length > 15 ? prizeName.substring(0, 12) + '...' : prizeName;
        
        const prizeBtn = $(`<button class="test-btn" style="padding:8px 12px;font-size:12px;border:1px solid #28a745;background:#28a745;color:white;border-radius:4px;cursor:pointer;">${shortName}</button>`);
        prizeBtn.click(() => testWheelResult(prizeName));
        buttonsRow.append(prizeBtn);
      });
    }
    
    testContainer.append(buttonsRow);
    $('#instantwin-game-canvas').append(testContainer);
  }
  
  function testWheelResult(targetPrize) {
    console.log('[Test] Testing wheel result - Target:', targetPrize);
    
    if (currentProduct.tickets.length === 0) {
      console.log('[Test] No tickets remaining');
      return;
    }
    
    // Disable spin button during test
    $('#instantwin-play-btn').prop('disabled', true).text('Testing...');
    
    // Simulate server response for testing
    const isWin = targetPrize !== 'X';
    const mockResponse = {
      success: true,
      result: {
        is_win: isWin,
        prize: isWin ? targetPrize : '',
        original_status: isWin ? 'WIN' : 'LOSE'
      },
      remaining_tickets: currentProduct.tickets.length - 1,
      total_plays: 1
    };
    
    console.log('[Test] Mock server response:', mockResponse);
    
    // Update plays left
    $('.plays-left').text('Plays left: ' + mockResponse.remaining_tickets);
    
    // Remove one ticket from client array (for testing purposes)
    if (currentProduct.tickets.length > 0) {
      currentProduct.tickets.shift();
    }
    
    // Start wheel spin with test result
    startWheelSpin(targetPrize, 'TEST_TICKET', mockResponse);
  }
  

  
  function setupSlotsGame() {
    console.log('[Game] Setting up slots game');
    
    // Remove any old content and create slots container
    $('#instantwin-game-canvas').empty();
    
    // Apply background image if available
    console.log('[Game] Current product background_image:', currentProduct.background_image);
    if (currentProduct.background_image && currentProduct.background_image.trim() !== '') {
      // Validate that it's a proper URL
      if (currentProduct.background_image.startsWith('http') || currentProduct.background_image.startsWith('/')) {
        $('#instantwin-game-canvas').css({
          'background-image': 'url(' + JSON.stringify(currentProduct.background_image) + ')',
          'background-size': 'cover',
          'background-position': 'center',
          'background-repeat': 'no-repeat'
        });
        console.log('[Game] Applied slots background:', currentProduct.background_image);
      } else {
        console.warn('[Game] Invalid background image URL:', currentProduct.background_image);
        $('#instantwin-game-canvas').css('background-image', '');
      }
    } else {
      console.log('[Game] No background image available');
      $('#instantwin-game-canvas').css('background-image', '');
    }
    
    // Create slots machine HTML
    const slotsHTML = `
      <div class="slots-container">
        <div class="slots-machine">
          <div class="slots-reels">
            <div class="reel" data-reel="0">
              <div class="reel-strip">
                <!-- Symbols will be populated here -->
              </div>
              <div class="reel-window"></div>
            </div>
            <div class="reel" data-reel="1">
              <div class="reel-strip">
                <!-- Symbols will be populated here -->
              </div>
              <div class="reel-window"></div>
            </div>
            <div class="reel" data-reel="2">
              <div class="reel-strip">
                <!-- Symbols will be populated here -->
              </div>
              <div class="reel-window"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    $('#instantwin-game-canvas').html(slotsHTML);
    
    // Populate reels with symbols
    populateSlotsReels();
    
    // Spins remaining counter above spin button
    const spinsRemaining = $(`<div class="plays-left">spins remaining: ${currentProduct.tickets.length}</div>`);
    $('#instantwin-game-canvas').append(spinsRemaining);
    
    // Create spin button
    const spinBtn = $('<button/>', {
      id: 'instantwin-play-btn',
      class: 'w-btn us-btn-style_1',
      text: 'Spin'
    });
    
    // Add spin button click handler
    spinBtn.click(function() {
      if (currentProduct.tickets.length === 0) {
        console.log('[Game] No tickets remaining');
        return;
      }
      
      console.log('[Game] Slots spin button clicked, tickets left:', currentProduct.tickets.length);
      
      const nextTicket = currentProduct.tickets[0].number;
      console.log('[Security] Playing ticket on server:', nextTicket);
      
      $(this).prop('disabled', true).text('Spinning...');
      
      playTicketSecurely(currentProduct.product_id, nextTicket)
        .done(function(response) {
          if (response.success) {
            console.log('[Security] Server validated ticket play:', response);
            
            // Debug: Show server debug data
            if (response.debug) {
              console.log('[🔍 SERVER DEBUG] Searched product ID:', response.debug.searched_product_id);
              console.log('[🔍 SERVER DEBUG] Searched ticket:', response.debug.searched_ticket);
              console.log('[🔍 SERVER DEBUG] Ticket found:', response.debug.ticket_found);
              console.log('[🔍 SERVER DEBUG] Available products:', response.debug.available_products);
              console.log('[🔍 SERVER DEBUG] Found product for counting:', response.debug.found_product_for_counting);
              console.log('[🔍 SERVER DEBUG] Total tickets counted:', response.debug.total_tickets_counted);
              console.log('[🔍 SERVER DEBUG] Remaining tickets counted:', response.debug.remaining_tickets_counted);
            }
            
            // Debug: Check counts before updating
            console.log('[Debug] Before update - Client tickets:', currentProduct.tickets.length);
            console.log('[Debug] Server says remaining:', response.remaining_tickets);
            
            // Update spins remaining with server-confirmed count FIRST
            $('.plays-left').text('spins remaining: ' + response.remaining_tickets);
            console.log('[Security] Server confirms', response.remaining_tickets, 'tickets remaining');
            
            // Then remove played ticket from client array to keep them in sync
            currentProduct.tickets.shift();
            console.log('[Debug] After shift - Client tickets:', currentProduct.tickets.length);
            
            // Use server result for slots
            const serverResult = response.result;
            const isWin = serverResult.is_win;
            const prize = serverResult.prize || '';
            console.log('[Security] Server result - Win:', isWin, 'Prize:', prize);
            
            // Start slots animation with server result
            startSlotsSpinAnimation(isWin, prize, nextTicket, response);
            
          } else {
            console.error('[Security] Server rejected ticket play:', response.error);
            $(this).prop('disabled', false).text('Spin');
            console.log('Error: ' + (response.error || 'Ticket validation failed'));
          }
        })
        .fail(function(xhr, status, error) {
          console.error('[Security] Server error playing ticket:', error);
          $(this).prop('disabled', false).text('Spin');
          console.log('Network error. Please try again.');
        });
    });
    
    // Add spin button below the slots
    $('#instantwin-game-canvas').append(spinBtn);
    
    // Add product thumbnail
    addProductThumbnail();
    
    // Add test buttons for each segment (prizes + lose)
    addSlotsTestButtons();
  }
  
  function addSlotsTestButtons() {
    console.log('[Test] Adding slots test buttons');
    
    const testContainer = $('<div class="slots-test-buttons" style="margin-top:20px;text-align:center;padding:15px;background:#f8f9fa;border-radius:8px;border:2px dashed #dee2e6;">');
    testContainer.append('<h4 style="margin:0 0 15px 0;color:#6c757d;font-size:14px;">🧪 Test Buttons (Debug Mode)</h4>');
    
    const buttonsRow = $('<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">');
    
    // Add LOSE test button
    const loseBtn = $('<button class="test-btn" style="padding:8px 12px;font-size:12px;border:1px solid #dc3545;background:#dc3545;color:white;border-radius:4px;cursor:pointer;">LOSE</button>');
    loseBtn.click(() => testSlotsResult(false, ''));
    buttonsRow.append(loseBtn);
    
    // Add test buttons for each prize
    if (allPrizes && allPrizes.length > 0) {
      allPrizes.forEach((prize, index) => {
        const prizeName = typeof prize === 'string' ? prize : (prize.name || 'Prize');
        const shortName = prizeName.length > 15 ? prizeName.substring(0, 12) + '...' : prizeName;
        
        const prizeBtn = $(`<button class="test-btn" style="padding:8px 12px;font-size:12px;border:1px solid #28a745;background:#28a745;color:white;border-radius:4px;cursor:pointer;">${shortName}</button>`);
        prizeBtn.click(() => testSlotsResult(true, prizeName));
        buttonsRow.append(prizeBtn);
      });
    }
    
    // Add test notification button to the buttons row
    const notificationBtn = $(`
      <button id="test-notification-btn" style="
        padding: 8px 12px;
        font-size: 12px;
        border: 1px solid #ff6b6b;
        background: #ff6b6b;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        margin: 0 4px;
      ">
        🎯 Test Notifications
      </button>
    `);
    
    notificationBtn.on('click', function() {
      // Show test win notification (permanent)
      showTestNotification('win', '⭐ Golden Palm - £1000');
      
      // Show test lose notification (permanent)
      setTimeout(() => {
        showTestNotification('lose', 'Sorry, no win this time!');
      }, 1000);
    });
    
    // Add test popup button
    const popupBtn = $(`
      <button id="test-popup-btn" style="
        padding: 8px 12px;
        font-size: 12px;
        border: 1px solid #9c27b0;
        background: #9c27b0;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        margin: 0 4px;
      ">
        🎁 Test Win Popup
      </button>
    `);
    
    popupBtn.on('click', function() {
      // Show test win popup with sample data
      const testWinsData = [
        {
          name: 'Golden Palm Resort Package',
          prizes: [
            {
              name: '⭐ Golden Palm - £1000',
              ticket: '12345'
            },
            {
              name: '🪨 Beach Pebble - £1 Site Credit',
              ticket: '67890'
            }
          ]
        },
        {
          name: 'Tropical Paradise Bundle',
          prizes: [
            {
              name: '🥥 Coconut Jackpot - £500',
              ticket: '11111'
            }
          ]
        }
      ];
      
      showWinPopup(testWinsData);
    });
    
    buttonsRow.append(popupBtn);
    
    buttonsRow.append(notificationBtn);
    
    testContainer.append(buttonsRow);
    $('#instantwin-game-canvas').append(testContainer);
  }
  
  function testSlotsResult(isWin, prize) {
    console.log('[Test] Testing slots result - Win:', isWin, 'Prize:', prize);
    
    if (currentProduct.tickets.length === 0) {
      console.log('[Test] No tickets remaining');
      return;
    }
    
    // Disable spin button during test
    $('#instantwin-play-btn').prop('disabled', true).text('Testing...');
    
    // Simulate server response for testing
    const mockResponse = {
      success: true,
      result: {
        is_win: isWin,
        prize: prize,
        original_status: isWin ? 'WIN' : 'LOSE'
      },
      remaining_tickets: currentProduct.tickets.length - 1,
      total_plays: 1
    };
    
    console.log('[Test] Mock server response:', mockResponse);
    
    // Update plays left
    $('.plays-left').text('Plays left: ' + mockResponse.remaining_tickets);
    
    // Remove one ticket from client array (for testing purposes)
    if (currentProduct.tickets.length > 0) {
      currentProduct.tickets.shift();
    }
    
    // Start slots animation with test result
    startSlotsSpinAnimation(isWin, prize, 'TEST_TICKET', mockResponse);
  }
  
  function setupScratchGame() {
    console.log('[Game] Setting up scratch game');
    
    // Remove any old content and create scratch container
    $('#instantwin-game-canvas').empty();
    
    // Remove any background image from game canvas for scratch mode
        $('#instantwin-game-canvas').css('background-image', '');
    
    // Show scratch card with all tickets
    showScratchCardWithAllTickets();
    
    // Add product thumbnail
    addProductThumbnail();
  }
  
  function showScratchCardWithAllTickets() {
    console.log('[Scratch] Showing scratch slider with individual cards');
    
    const scratchHTML = `
      <div class="scratch-container">
        <div class="scratch-header">
          <h3>You have <span id="remaining-cards-count">${currentProduct.tickets.length}</span> <span id="remaining-cards-text">${currentProduct.tickets.length === 1 ? 'scratchcard' : 'scratchcards'}</span> remaining</h3>
          <p>Scratch now to see if you've won!</p>
        </div>
                <div class="scratch-slider-container">
          <!-- Loading overlay -->
          <div id="scratch-slider-loading" class="slider-loading-overlay">
            <div class="loading-spinner">
              <div class="spinner"></div>
              <p>Loading scratch cards...</p>
            </div>
          </div>
          
          <div class="owl-carousel owl-theme" id="scratch-cards-slider">
            <!-- Individual scratch cards will be populated here -->
        </div>
          
          <!-- Card counter and auto-reveal controls -->
          <div class="scratch-controls">
            ${currentProduct.tickets && currentProduct.tickets.length > 1 ? `
              <div class="card-counter">
                Card <span id="current-card-number">1</span> of <span id="total-cards">${currentProduct.tickets.length}</span>
        </div>
              
              <div class="auto-reveal-button-container">
                <button id="auto-reveal-btn" class="auto-reveal-btn">
                  Click to Auto-Reveal
                </button>
              </div>
            ` : `
            `}
          </div>
        </div>
      </div>
    `;
    
    $('#instantwin-game-canvas').html(scratchHTML);
    
    // Hide plays left for scratch game
    $('.plays-left').hide();
    
    // Populate individual scratch cards
    populateScratchSliderCards();
    
    // Initialize Owl Carousel after cards are populated
        setTimeout(() => {
      initializeScratchSlider();
    }, 200);
    

    
    // Load any existing scratch progress
    loadScratchSliderProgress();
    
    // Add auto-reveal button event handler
    $('#auto-reveal-btn').click(function() {
      // Force initialize audio on first click
      console.log('[Auto-Reveal] Button clicked - initializing audio...');
      
      // Resume audio context if suspended (required for autoplay)
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('[Audio] Audio context resumed from suspended state');
        });
      }
      
      if (!scratchAudio && !scratchAudioFailed) {
        initScratchSound();
      }
      
      const $button = $(this);
      const $slider = $('#scratch-cards-slider');
      const currentIndex = $slider.find('.owl-item.active.center').index();
      const $currentCard = $slider.find('.owl-item').eq(currentIndex).find('.scratch-card-individual');
      
      console.log('[Auto-Reveal] Button clicked - currentIndex:', currentIndex, 'currentCard found:', $currentCard.length > 0);
      
      if ($currentCard.length === 0) {
        console.error('[Auto-Reveal] No current card found');
        return;
      }
      
      const ticketNumber = $currentCard.data('ticket');
      const isWin = $currentCard.find('.ticket-result-new').hasClass('win');
      
      // Play appropriate sound based on result
      setTimeout(() => {
        if (isWin) {
          // Play WIN sound instead of scratch sound
          console.log('[Auto-Reveal] Win detected - playing WIN sound');
          if (gameSounds && gameSounds.winning) {
            gameSounds.winning.currentTime = 0;
            gameSounds.winning.play().then(() => {
              console.log('[Auto-Reveal] WIN sound played successfully');
            }).catch((error) => {
              console.log('[Auto-Reveal] Error playing WIN sound:', error.message);
              // Fallback to scratch sound if WIN sound fails
              playScratchSound();
            });
          } else {
            // Fallback to scratch sound if WIN sound not available
            console.log('[Auto-Reveal] WIN sound not available, using scratch sound');
            playScratchSound();
          }
        } else {
          // Play scratch sound for non-win
          console.log('[Auto-Reveal] Non-win detected - playing scratch sound');
          playScratchSound();
        }
      }, 50);
      
      // Get prize from win content or from ticket data
      let prize = '';
      if (isWin) {
        // Try to get from win-content first
        prize = $currentCard.find('.win-content').first().text().trim();
        
        // If no prize in win-content, try to get from ticket data
        if (!prize) {
          const ticketData = currentProduct.tickets.find(t => t.number == ticketNumber);
          if (ticketData && ticketData.prize) {
            prize = ticketData.prize;
          }
        }
        
        // If still no prize, use default win message
        if (!prize) {
          prize = '🎁 Prize';
        }
      }
      
      console.log('[Auto-Reveal] Button clicked for ticket:', ticketNumber, 'isWin:', isWin, 'prize:', prize);
      console.log('[Auto-Reveal] Card classes:', $currentCard.find('.ticket-result-new').attr('class'));
      console.log('[Auto-Reveal] Win content found:', $currentCard.find('.win-content').length);
      console.log('[Auto-Reveal] Ticket data:', currentProduct.tickets.find(t => t.number == ticketNumber));
      
      // Reveal the current card
      revealCurrentCard($currentCard, isWin, prize);
      
      // Show win notification like slots game (not final popup)
      if (isWin) {
        showAutoRevealWinNotification(prize);
      }
      
      // Disable the button after use
      $button.prop('disabled', true).text('Revealed').addClass('revealed');
    });
    
    // Update card counter and auto-reveal button state when slider changes
    $('#scratch-cards-slider').on('translated.owl.carousel', function() {
      if (currentProduct && currentProduct.tickets) {
        updateCardCounter();
        updateAutoRevealButtonState();
      }
    });
    
    // Initial card counter update
    if (currentProduct && currentProduct.tickets) {
      updateCardCounter();
    }
  }
  
  function updateCardCounter() {
    // Check if currentProduct exists and has tickets
    if (!currentProduct || !currentProduct.tickets) {
      console.log('[Card Counter] No current product or tickets available, skipping counter update');
      return;
    }
    
    const totalCards = currentProduct.tickets.length;
    
    // Don't update counter if only 1 card
    if (totalCards <= 1) {
      console.log('[Card Counter] Single card detected, skipping counter update');
      return;
    }
    
    const $slider = $('#scratch-cards-slider');
    const $activeItem = $slider.find('.owl-item.active.center');
    const $currentCard = $activeItem.find('.scratch-card-individual');
    const currentIndex = $activeItem.index();
    
    // Use data-index from the current card for accurate counting
    let currentCardNumber = 1;
    
    const dataIndex = $currentCard.data('index');
    if (dataIndex !== undefined && dataIndex !== null) {
      currentCardNumber = dataIndex + 1;
      console.log('[Card Counter] Using data-index:', dataIndex, '-> card number:', currentCardNumber);
    } else {
      // Fallback to Owl Carousel's current() method
      try {
        const owlInstance = $slider.data('owl.carousel');
        if (owlInstance && typeof owlInstance.current === 'function') {
          const owlCurrent = owlInstance.current();
          currentCardNumber = owlCurrent + 1;
          console.log('[Card Counter] Using Owl current():', owlCurrent, '-> card number:', currentCardNumber);
        } else {
          // Fallback to index method
          if (currentIndex >= 0 && currentIndex < totalCards) {
            currentCardNumber = currentIndex + 1;
          } else if (currentIndex >= totalCards) {
            // Handle loop case
            currentCardNumber = (currentIndex % totalCards) + 1;
          }
          
          // Ensure currentCardNumber is within valid range
          currentCardNumber = Math.max(1, Math.min(currentCardNumber, totalCards));
        }
      } catch (error) {
        console.log('[Card Counter] Error getting Owl current, using index fallback:', error);
        // Fallback to index method
        if (currentIndex >= 0 && currentIndex < totalCards) {
          currentCardNumber = currentIndex + 1;
        } else if (currentIndex >= totalCards) {
          currentCardNumber = (currentIndex % totalCards) + 1;
        }
        currentCardNumber = Math.max(1, Math.min(currentCardNumber, totalCards));
      }
    }
    
    $('#current-card-number').text(currentCardNumber);
    $('#total-cards').text(totalCards);
    
    console.log('[Card Counter] Updated to:', currentCardNumber, 'of', totalCards, '(index:', currentIndex, ', data-index:', dataIndex, ')');
  }

  function updateRemainingCardsCount() {
    // Check if currentProduct exists and has tickets
    if (!currentProduct || !currentProduct.tickets) {
      console.log('[Remaining Cards] No current product or tickets available, skipping count update');
      return;
    }
    
    const totalCards = currentProduct.tickets.length;
    
    // Get all revealed cards and count unique ticket numbers
    const revealedCards = $('.scratch-card-individual.revealed');
    const revealedTicketNumbers = revealedCards.map(function() {
      return $(this).data('ticket');
    }).get();
    const uniqueRevealedTickets = [...new Set(revealedTicketNumbers)];
    const revealedCount = uniqueRevealedTickets.length;
    
    const remainingCards = totalCards - revealedCount;
    
    // Debug: Log all revealed cards
    console.log('[Remaining Cards] Total:', totalCards, 'Revealed:', revealedCount, 'Remaining:', remainingCards);
    console.log('[Remaining Cards] Revealed ticket numbers:', uniqueRevealedTickets);
    console.log('[Remaining Cards] All revealed cards in DOM:', revealedCards.length);
    
    $('#remaining-cards-count').text(remainingCards);
    $('#remaining-cards-text').text(remainingCards === 1 ? 'scratchcard' : 'scratchcards');
  }
  
  function revealCurrentCard($card, isWin, prize) {
    console.log('[Auto-Reveal] Revealing current card');
    
    const ticketNumber = $card.data('ticket');
    
    // Hide canvas elements for revealed cards
    $card.find('.circle-canvas').hide();
    
    // Show all circle content
    $card.find('.circle-content').show();
    
    // Add revealed class
    $card.addClass('revealed');
    
    // Disable scratch functionality for this card
    $card.find('.scratch-circles-container').off('mousedown mousemove mouseup mouseleave');
    $card.find('.circle-canvas').off('mousedown mousemove mouseup mouseleave');
    
    // Add a flag to prevent scratch initialization
    $card.attr('data-revealed', 'true');
    
    console.log('[Auto-Reveal] Scratch functionality disabled for card:', ticketNumber);
    
          // Save auto-reveal state
      saveAutoRevealState(ticketNumber, {
        revealed: true,
        isWin: isWin,
        prize: prize,
        timestamp: Date.now()
      });
      
      // Clear scratch progress for this card (only when fully revealed)
      clearScratchProgress(ticketNumber);
    
    // Update remaining cards count
    updateRemainingCardsCount();
  }
  
  function saveAutoRevealState(ticketNumber, state) {
    // Check if instantWinAjax is available
    if (typeof instantWinAjax === 'undefined') {
      console.error('[Auto-Reveal] instantWinAjax not available, using fallback');
      // Fallback to localStorage for now
      const storageKey = `auto_reveal_${ticketNumber}`;
      localStorage.setItem(storageKey, JSON.stringify(state));
      return;
    }
    
    // Get product ID from the current card or global state
    let productId = null;
    
    if (currentProduct && (currentProduct.id || currentProduct.product_id)) {
      productId = currentProduct.id || currentProduct.product_id;
    } else {
      // Try to get product ID from the current card
      const $slider = $('#scratch-cards-slider');
      const $currentCard = $slider.find('.owl-item.active.center').find('.scratch-card-individual');
      if ($currentCard.length > 0) {
        productId = $currentCard.data('product-id');
      }
    }
    
    if (!productId) {
      console.error('[Auto-Reveal] No product ID available for ticket:', ticketNumber);
      return;
    }
    
    const data = {
      action: 'save_auto_reveal_state',
      nonce: instantWinAjax.nonce,
      product_id: productId,
      ticket_number: ticketNumber,
      state: state
    };
    
    console.log('[Auto-Reveal] Saving state with data:', data);
    
    $.ajax({
      url: instantWinAjax.ajaxurl,
      type: 'POST',
      data: data,
      success: function(response) {
        if (response.success) {
          console.log('[Auto-Reveal] Saved state for ticket:', ticketNumber, state);
        } else {
          console.error('[Auto-Reveal] Failed to save state:', response.data);
        }
      },
      error: function(xhr, status, error) {
        console.error('[Auto-Reveal] AJAX error:', error);
      }
    });
  }
  
  function getAutoRevealState(ticketNumber) {
    if (!currentProduct || !currentProduct.id) {
      return null;
    }
    
    // Return cached state if available
    if (window.autoRevealStates && window.autoRevealStates[ticketNumber]) {
      return window.autoRevealStates[ticketNumber];
    }
    
    const data = {
      action: 'get_auto_reveal_state',
      nonce: instantWinAjax.nonce,
      product_id: currentProduct.id,
      ticket_number: ticketNumber
    };
    
    // For now, return null and load states in bulk
    return null;
  }
  
  function loadAllAutoRevealStates() {
    // Check if instantWinAjax is available
    if (typeof instantWinAjax === 'undefined') {
      console.error('[Auto-Reveal] instantWinAjax not available, using fallback');
      // Fallback to localStorage
      const states = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('auto_reveal_')) {
          try {
            const state = JSON.parse(localStorage.getItem(key));
            const ticketNumber = key.replace('auto_reveal_', '');
            states[ticketNumber] = state;
          } catch (e) {
            console.error('[Auto-Reveal] Error parsing localStorage item:', key, e);
          }
        }
      }
      window.autoRevealStates = states;
      return Promise.resolve(states);
    }
    
    // Get product ID from the first card or global state
    let productId = null;
    
    if (currentProduct && (currentProduct.id || currentProduct.product_id)) {
      productId = currentProduct.id || currentProduct.product_id;
      console.log('[Auto-Reveal] Using product ID from currentProduct:', productId);
    } else {
      // Try to get product ID from the first card
      const $firstCard = $('.scratch-card-individual').first();
      if ($firstCard.length > 0) {
        productId = $firstCard.data('product-id');
        console.log('[Auto-Reveal] Using product ID from first card:', productId);
      }
    }
    
    // If still no product ID, try to get from instantWin object
    if (!productId && typeof instantWin !== 'undefined' && instantWin.order_id) {
      // Use order ID as fallback for product ID
      productId = instantWin.order_id;
      console.log('[Auto-Reveal] Using order ID as product ID fallback:', productId);
    }
    
    if (!productId) {
      console.error('[Auto-Reveal] No product ID available for loading states, using fallback');
      return Promise.resolve({});
    }
    
    const data = {
      action: 'get_all_auto_reveal_states',
      nonce: instantWinAjax.nonce,
      product_id: productId
    };
    
    console.log('[Auto-Reveal] Loading states with data:', data);
    
    return new Promise(function(resolve, reject) {
      $.ajax({
        url: instantWinAjax.ajaxurl,
        type: 'POST',
        data: data,
        success: function(response) {
          console.log('[Auto-Reveal] Raw AJAX response:', response);
          
          let states = {};
          if (response && response.success && response.data) {
            states = response.data;
            console.log('[Auto-Reveal] Extracted states from response.data:', states);
          } else if (response && typeof response === 'object') {
            states = response;
            console.log('[Auto-Reveal] Using response directly as states:', states);
          }
          
          window.autoRevealStates = states;
          console.log('[Auto-Reveal] Final states to resolve:', window.autoRevealStates);
          resolve(states); // Resolve with extracted states
        },
        error: function(xhr, status, error) {
          console.error('[Auto-Reveal] AJAX error loading states:', error);
          resolve({}); // Resolve with empty object on error
        }
      });
    });
  }
  
  function clearAutoRevealStates() {
    // Check if instantWinAjax is available
    if (typeof instantWinAjax === 'undefined') {
      console.error('[Auto-Reveal] instantWinAjax not available, using fallback');
      // Fallback to localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('auto_reveal_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      window.autoRevealStates = {};
      console.log('[Auto-Reveal] Cleared', keysToRemove.length, 'localStorage items');
      return;
    }
    
    // Get product ID from the first card or global state
    let productId = null;
    
    if (currentProduct && (currentProduct.id || currentProduct.product_id)) {
      productId = currentProduct.id || currentProduct.product_id;
    } else {
      // Try to get product ID from the first card
      const $firstCard = $('.scratch-card-individual').first();
      if ($firstCard.length > 0) {
        productId = $firstCard.data('product-id');
      }
    }
    
    if (!productId) {
      console.log('[Auto-Reveal] No product ID available for clearing states, using fallback');
      // Use fallback to clear all localStorage items
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('auto_reveal_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      window.autoRevealStates = {};
      console.log('[Auto-Reveal] Cleared', keysToRemove.length, 'localStorage items as fallback');
      return;
    }
    
    const data = {
      action: 'clear_auto_reveal_states',
      nonce: instantWinAjax.nonce,
      product_id: productId
    };
    
    console.log('[Auto-Reveal] Clearing states with data:', data);
    
    $.ajax({
      url: instantWinAjax.ajaxurl,
      type: 'POST',
      data: data,
      success: function(response) {
        if (response.success) {
          console.log('[Auto-Reveal] Cleared all states for product:', productId);
          window.autoRevealStates = {};
        } else {
          console.error('[Auto-Reveal] Failed to clear states:', response.data);
        }
      },
      error: function(xhr, status, error) {
        console.error('[Auto-Reveal] AJAX error clearing states:', error);
      }
    });
  }
  
  function restoreAutoRevealedCards() {
    console.log('[Auto-Reveal] Restoring auto-revealed cards');
    console.log('[Auto-Reveal] Current product object:', currentProduct);
    
    // Load all auto-reveal states from server first
    loadAllAutoRevealStates().then(function(states) {
      console.log('[Auto-Reveal] States to restore:', states);
      console.log('[Auto-Reveal] States type:', typeof states);
      console.log('[Auto-Reveal] States keys:', Object.keys(states));
      console.log('[Auto-Reveal] States is array:', Array.isArray(states));
      
      console.log('[Auto-Reveal] Checking', $('.scratch-card-individual').length, 'cards for restoration');
      
      $('.scratch-card-individual').each(function() {
        const $card = $(this);
        const ticketNumber = $card.data('ticket');
        
        // Try both string and number versions of ticket number
        const autoRevealState = states[ticketNumber] || states[ticketNumber.toString()] || states[parseInt(ticketNumber)];
        
        console.log('[Auto-Reveal] Checking card ticket:', ticketNumber, 'type:', typeof ticketNumber, 'has state:', !!autoRevealState, 'revealed:', autoRevealState?.revealed);
        console.log('[Auto-Reveal] States keys:', Object.keys(states), 'looking for:', ticketNumber, 'or', ticketNumber.toString(), 'or', parseInt(ticketNumber));
        
        if (autoRevealState && autoRevealState.revealed) {
          console.log('[Auto-Reveal] Restoring card:', ticketNumber, 'state:', autoRevealState);
          
          // Hide canvas elements for revealed cards
          $card.find('.circle-canvas').hide();
          
          // Show circle content
          $card.find('.circle-content').show();
          
          // Add revealed class to card
          $card.addClass('revealed');
          
          // Update ticket-result-new class
          $card.find('.ticket-result-new').addClass('revealed');
          
          // Disable scratch functionality for this card
          $card.find('.scratch-circles-container').off('mousedown mousemove mouseup mouseleave');
          $card.find('.circle-canvas').off('mousedown mousemove mouseup mouseleave');
          
          // Add a flag to prevent scratch initialization
          $card.attr('data-revealed', 'true');
          
          console.log('[Auto-Reveal] Card restored and scratch disabled:', ticketNumber);
        }
      });
      
      // Update auto-reveal button state based on current card
      updateAutoRevealButtonState();
      
      // Update remaining cards count after restoring
      updateRemainingCardsCount();
    });
  }
  
  function updateAutoRevealButtonState() {
    // Check if currentProduct exists and has tickets
    if (!currentProduct || !currentProduct.tickets) {
      console.log('[Auto-Reveal] No current product or tickets available, skipping button update');
      return;
    }
    
    const totalCards = currentProduct.tickets.length;
    
    // Don't update button if only 1 card (button won't exist)
    if (totalCards <= 1) {
      console.log('[Auto-Reveal] Single card detected, skipping button update');
      return;
    }
    
    const $slider = $('#scratch-cards-slider');
    const $activeItem = $slider.find('.owl-item.active.center');
    const currentIndex = $activeItem.index();
    const $currentCard = $slider.find('.owl-item').eq(currentIndex).find('.scratch-card-individual');
    const $button = $('#auto-reveal-btn');
    
    console.log('[Auto-Reveal] Updating button state - currentIndex:', currentIndex, 'card found:', $currentCard.length > 0);
    
    if ($currentCard.length > 0 && $button.length > 0) {
      const ticketNumber = $currentCard.data('ticket');
      const isRevealed = $currentCard.hasClass('revealed');
      
      console.log('[Auto-Reveal] Card ticket:', ticketNumber, 'isRevealed:', isRevealed);
      
      if (isRevealed) {
        $button.prop('disabled', true).text('Revealed').addClass('revealed');
        console.log('[Auto-Reveal] Button disabled for revealed card');
      } else {
        $button.prop('disabled', false).text('Click to Auto-Reveal').removeClass('revealed');
        console.log('[Auto-Reveal] Button enabled for unrevealed card');
      }
    }
  }
  
  function populateScratchSliderCards() {
    console.log('[Scratch] Populating scratch slider cards');
    
    const slider = $('#scratch-cards-slider');
    slider.empty();
    
    if (!currentProduct.tickets || currentProduct.tickets.length === 0) {
      slider.html('<div class="item"><p style="color:#666;text-align:center;">No tickets available</p></div>');
      return;
    }
    
    console.log('[Scratch] Total tickets to create cards for:', currentProduct.tickets.length);
    console.log('[Scratch] Current product ID:', currentProduct.product_id || currentProduct.id);
    
    currentProduct.tickets.forEach((ticket, index) => {
      const isWin = ticket.status === 'WIN';
      const prize = ticket.prize || '';
      const ticketNumber = ticket.number;
      
      // Find prize image if available
      let prizeImage = '';
      if (isWin && prize && allPrizes && allPrizes.length > 0) {
        const prizeObj = allPrizes.find(p => {
          if (typeof p === 'string') {
            return p === prize;
          } else if (p && p.name) {
            return p.name === prize;
          }
          return false;
        });
        
        if (prizeObj && typeof prizeObj === 'object' && prizeObj.image) {
          prizeImage = prizeObj.image;
        }
      }
      
      // Create individual scratch card
      const cardHTML = `
        <div class="item">
          <div class="scratch-card-individual" data-ticket="${ticketNumber}" data-product-id="${currentProduct.product_id || currentProduct.id}" data-index="${index}">
            <div class="scratch-card-container">
              <div class="scratch-result-content">
                ${createTicketResultHTML(ticket, prizeImage)}
              </div>
            </div>

          </div>
        </div>
      `;
      
      slider.append(cardHTML);
      
      // Debug: Log first few cards to check data attributes
      if (index < 3) {
        console.log(`[Scratch] Card ${index + 1} - Ticket: ${ticketNumber}, Product ID: ${currentProduct.product_id || currentProduct.id}, Data Index: ${index}`);
      }
      
      // Debug: Log total cards created
      if (index === currentProduct.tickets.length - 1) {
        console.log(`[Scratch] Total cards created: ${currentProduct.tickets.length}`);
      }
    });
    
    // Apply background image to all individual scratch cards
    if (currentProduct.background_image && currentProduct.background_image.trim() !== '') {
      if (currentProduct.background_image.startsWith('http') || currentProduct.background_image.startsWith('/')) {
        $('.scratch-card-individual').css({
          'background-image': 'url(' + JSON.stringify(currentProduct.background_image) + ')',
          'background-size': 'cover',
          'background-position': 'center',
          'background-repeat': 'no-repeat'
        });
        console.log('[Scratch] Applied background to individual cards:', currentProduct.background_image);
      } else {
        console.warn('[Scratch] Invalid background image URL:', currentProduct.background_image);
      }
    } else {
      console.log('[Scratch] No background image available for cards');
    }
    
    console.log('[Scratch] Successfully created', currentProduct.tickets.length, 'scratch cards');
    
    // Debug: Check for duplicate cards after creation
    const totalCardsCreated = $('.scratch-card-individual').length;
    console.log('[Scratch] Total cards in DOM after creation:', totalCardsCreated);
    
    if (totalCardsCreated !== currentProduct.tickets.length) {
      console.warn('[Scratch] WARNING: Card count mismatch! Expected:', currentProduct.tickets.length, 'Found:', totalCardsCreated);
    }
  }
  
  function createTicketResultHTML(ticket, prizeImage) {
    const isWin = ticket.status === 'WIN';
    const prize = ticket.prize || '';
    const ticketNumber = ticket.number;
    
    // Generate scratch circles (4 circles in a row)
    const scratchCirclesHTML = createScratchCirclesHTML(isWin, prize);
    
    // Generate available prizes list
    const availablePrizesHTML = createAvailablePrizesHTML();
    
    return `
      <div class="ticket-result-new ${isWin ? 'win' : 'lose'}">
        <div class="scratch-circles-section">
          <div class="scratch-circles-container">
            ${scratchCirclesHTML}
          </div>
        </div>
      </div>
    `;
  }
  
  function createScratchCirclesHTML(isWin, prize) {
    const circles = [];
    
    if (isWin) {
      // Find winning prize icon/image
      let winIcon = '🎁'; // default icon
      console.log('[Scratch] Looking for winning prize:', prize);
      console.log('[Scratch] Available prizes:', allPrizes);
      
      if (allPrizes && allPrizes.length > 0) {
        // First try to find exact match
        let prizeObj = allPrizes.find(p => {
          if (typeof p === 'string') {
            return p === prize;
          } else if (p && p.name) {
            return p.name === prize;
          }
          return false;
        });
        
        // If not found, try to find by different property names
        if (!prizeObj) {
          prizeObj = allPrizes.find(p => {
            if (typeof p === 'object' && p) {
              return p.prize_name === prize || 
                     p.title === prize || 
                     p.label === prize ||
                     p.value === prize;
            }
            return false;
          });
        }
        
        console.log('[Scratch] Found prize object:', prizeObj);
        
        if (prizeObj) {
          if (typeof prizeObj === 'string') {
            winIcon = prizeObj;
            console.log('[Scratch] Using string prize as icon:', winIcon);
          } else if (prizeObj && typeof prizeObj === 'object') {
            // Use same logic as lose rows for consistency - try multiple field names
            if (prizeObj.icon) {
              if (typeof prizeObj.icon === 'string' && prizeObj.icon.startsWith('http')) {
                winIcon = `<img src="${prizeObj.icon}" alt="${prize}" class="circle-icon-img" />`;
              } else {
                winIcon = prizeObj.icon;
              }
              console.log('[Scratch] Using icon:', winIcon);
            } else if (prizeObj.icon_prize) {
              if (typeof prizeObj.icon_prize === 'string' && prizeObj.icon_prize.startsWith('http')) {
                winIcon = `<img src="${prizeObj.icon_prize}" alt="${prize}" class="circle-icon-img" />`;
              } else {
                winIcon = prizeObj.icon_prize;
              }
              console.log('[Scratch] Using icon_prize:', winIcon);
            } else if (prizeObj.image) {
              winIcon = `<img src="${prizeObj.image}" alt="${prize}" class="circle-icon-img" />`;
              console.log('[Scratch] Using image:', winIcon);
            } else if (prizeObj.d_prize_image) {
              winIcon = `<img src="${prizeObj.d_prize_image}" alt="${prize}" class="circle-icon-img" />`;
              console.log('[Scratch] Using d_prize_image:', winIcon);
            } else {
              // If no icon/image found, try using any available prize icon as fallback
              const firstPrizeWithIcon = allPrizes.find(p => p && p.icon);
              if (firstPrizeWithIcon) {
                winIcon = firstPrizeWithIcon.icon;
                console.log('[Scratch] Using fallback icon from first prize:', winIcon);
              }
            }
          }
        } else {
          console.warn('[Scratch] Prize not found in allPrizes:', prize);
          console.log('[Scratch] Trying first available prize as fallback');
          
          // Use first available prize icon as fallback
          const fallbackPrize = allPrizes[0];
          if (fallbackPrize) {
            if (typeof fallbackPrize === 'string') {
              winIcon = fallbackPrize;
            } else if (fallbackPrize.icon) {
              winIcon = fallbackPrize.icon;
            } else if (fallbackPrize.image) {
              winIcon = `<img src="${fallbackPrize.image}" alt="prize" class="circle-icon-img" />`;
            }
            console.log('[Scratch] Using fallback prize:', winIcon);
          }
        }
      } else {
        console.warn('[Scratch] No allPrizes data available');
      }
      
      console.log('[Scratch] Final winIcon:', winIcon);
      
      // Win ticket: Only 1 row (4 columns) has same icon from actual winning prize
      const winRow = Math.floor(Math.random() * 3); // Random row 0, 1, or 2
      
      // Get all available prize icons/images (excluding the winning prize for other rows)
      const availableIcons = [];
      if (allPrizes && allPrizes.length > 0) {
        allPrizes.forEach(prizeItem => {
          // Skip the winning prize for other rows
          if (typeof prizeItem === 'string') {
            if (prizeItem !== prize) {
              availableIcons.push(prizeItem);
            }
          } else if (prizeItem && prizeItem.name && prizeItem.name !== prize) {
            let prizeIcon = '🎁'; // default
            if (prizeItem.icon) {
              if (typeof prizeItem.icon === 'string' && prizeItem.icon.startsWith('http')) {
                prizeIcon = `<img src="${prizeItem.icon}" alt="${prizeItem.name}" class="circle-icon-img" />`;
              } else {
                prizeIcon = prizeItem.icon;
              }
            } else if (prizeItem.image) {
              prizeIcon = `<img src="${prizeItem.image}" alt="${prizeItem.name}" class="circle-icon-img" />`;
            }
            availableIcons.push(prizeIcon);
          }
        });
      }
      
      // Fallback if no other prizes available
      if (availableIcons.length === 0) {
        availableIcons.push('🎁', '🏆', '💰', '🎉');
      }
      
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 4; col++) {
          const index = row * 4 + col;
          let icon;
          
          if (row === winRow) {
            // Winning row - all same icon (the actual winning prize icon/image)
            icon = winIcon;
          } else {
            // Other rows - different prize icons (excluding winning prize)
            icon = availableIcons[Math.floor(Math.random() * availableIcons.length)];
          }
          
          circles.push(`
            <div class="scratch-circle" data-circle="${index}" data-row="${row}" data-col="${col}">
              <div class="circle-content ${row === winRow ? 'win-content' : 'lose-content'}">
                ${icon}
              </div>
              <canvas class="circle-canvas" width="50" height="50"></canvas>
            </div>
          `);
        }
      }
    } else {
      // Lose ticket: No row has all same icons (3 rows x 4 cols)
      // Get all available prize icons/images
      const availableIcons = [];
      if (allPrizes && allPrizes.length > 0) {
        allPrizes.forEach(prize => {
          let prizeIcon = '🎁'; // default
          if (typeof prize === 'string') {
            prizeIcon = prize;
          } else if (prize && prize.name) {
            if (prize.icon) {
              if (typeof prize.icon === 'string' && prize.icon.startsWith('http')) {
                prizeIcon = `<img src="${prize.icon}" alt="${prize.name}" class="circle-icon-img" />`;
              } else {
                prizeIcon = prize.icon;
              }
            } else if (prize.image) {
              prizeIcon = `<img src="${prize.image}" alt="${prize.name}" class="circle-icon-img" />`;
            }
          }
          availableIcons.push(prizeIcon);
        });
      }
      
      // Fallback if no prizes available
      if (availableIcons.length === 0) {
        availableIcons.push('🎁', '🏆', '💰', '🎉', '🎯', '🎊', '🏅', '💎');
      }
      
      // Ensure we have enough different icons to avoid rows with same icons
      const shuffledIcons = [...availableIcons];
      while (shuffledIcons.length < 12) {
        shuffledIcons.push(...availableIcons);
      }
      
      for (let row = 0; row < 3; row++) {
        const rowIcons = [];
        for (let col = 0; col < 4; col++) {
          const index = row * 4 + col;
          let icon;
          
          // Ensure each row has mixed icons - no 4 same icons in a row
          do {
            icon = shuffledIcons[Math.floor(Math.random() * shuffledIcons.length)];
          } while (rowIcons.includes(icon) && availableIcons.length > 1);
          
          rowIcons.push(icon);
          
          circles.push(`
            <div class="scratch-circle" data-circle="${index}" data-row="${row}" data-col="${col}">
              <div class="circle-content lose-content">
                ${icon}
              </div>
              <canvas class="circle-canvas" width="50" height="50"></canvas>
            </div>
          `);
        }
      }
    }
    
    return circles.join('');
  }
  
  function createAvailablePrizesHTML() {
    if (!allPrizes || allPrizes.length === 0) {
      return '<p class="no-prizes">No prizes available</p>';
    }
    
    const prizesHTML = allPrizes.map(prize => {
      let prizeIcon = '🎁'; // default icon
      let prizeName = '';
      
      if (typeof prize === 'string') {
        prizeName = prize;
      } else if (prize && prize.name) {
        prizeName = prize.name;
        
        // Prioritize icon over image as requested
        if (prize.icon) {
          if (typeof prize.icon === 'string' && prize.icon.startsWith('http')) {
            prizeIcon = `<img src="${prize.icon}" alt="${prizeName}" class="prize-list-icon" />`;
          } else {
            prizeIcon = prize.icon;
          }
        } else if (prize.image) {
          prizeIcon = `<img src="${prize.image}" alt="${prizeName}" class="prize-list-icon" />`;
        }
      }
      
      return `
        <div class="prize-item">
          <span class="prize-icon">${prizeIcon}</span>
        </div>
      `;
    }).join('');
    
    return prizesHTML;
  }
  
  function initializeScratchSlider() {
    console.log('[Scratch] Initializing scratch slider');
    
    // Get total number of cards
    const totalCards = currentProduct.tickets.length;
    console.log('[Scratch] Total cards to display:', totalCards);
    
    // Determine items to show based on total cards
    let itemsToShow = 3; // Show 3 items for stacked effect
    let loopEnabled = totalCards > 1; // Enable loop if more than 1 card
    let marginValue = 0; // No margin for single item display
    
    if (totalCards < 3) {
      itemsToShow = totalCards;
      marginValue = 0; // No margin for less than 3 cards
      console.log('[Scratch] Less than 3 cards detected, adjusting settings');
    }
    
    console.log('[Scratch] Cards detected:', totalCards, 'itemsToShow:', itemsToShow, 'loop:', loopEnabled, 'margin:', marginValue);
    
    console.log('[Scratch] Cards detected:', totalCards, 'itemsToShow:', itemsToShow, 'loop:', loopEnabled, 'margin:', marginValue);
    
    // Initialize Owl Carousel
    console.log('[Scratch] Owl settings - items:', itemsToShow, 'loop:', loopEnabled, 'nav:', totalCards > 1, 'center:', totalCards > 1);
    
    $('#scratch-cards-slider').addClass('center_item').owlCarousel({
      items: itemsToShow,
      loop: loopEnabled,
      margin: marginValue,
      nav: totalCards > 1, // Only show nav if more than 1 card
      dots: false,
      center: totalCards > 1, // Center if more than 1 card
      mouseDrag: false,
      touchDrag: false,
      pullDrag: false,
      freeDrag: false,
      smartSpeed: 600, // Smoother transition speed
      animateIn: 'fadeIn',
      animateOut: 'fadeOut',
      navText: ['<span class="nav-btn nav-prev">‹</span>', '<span class="nav-btn nav-next">›</span>'],
      responsive: {
        0: { 
          items: itemsToShow,
          center: totalCards > 1,
          margin: totalCards < 3 ? 0 : -150,
          mouseDrag: false,
          touchDrag: false
        },
        768: { 
          items: itemsToShow,
          center: totalCards > 1,
          margin: totalCards < 3 ? 0 : -180,
          mouseDrag: false,
          touchDrag: false
        },
        1024: { 
          items: itemsToShow,
          center: totalCards > 1,
          margin: totalCards < 3 ? 0 : marginValue,
          mouseDrag: false,
          touchDrag: false
        }
      },
      onInitialized: function(event) {
        console.log('[Scratch] Owl Carousel initialized');
        console.log('[Scratch] Total cards in slider:', $('.scratch-card-individual').length);
        console.log('[Scratch] Owl items count:', $('.owl-item').length);
        
        // Add smooth transition handling
        const $slider = $('#scratch-cards-slider');
        $slider.on('changed.owl.carousel', function(event) {
          // Ensure smooth transitions between cards
          $('.owl-item').css('transition', 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)');
        });
        
        // Show/hide navigation arrows based on card count
        if (totalCards > 1) {
          $('.scratch-slider-container .owl-nav').show();
          $('.scratch-slider-container .owl-nav button').show();
          console.log('[Scratch] Navigation arrows visible for', totalCards, 'cards');
        } else {
          $('.scratch-slider-container .owl-nav').hide();
          $('.scratch-slider-container .owl-nav button').hide();
          console.log('[Scratch] Navigation arrows hidden for single card');
        }
        
        // Debug navigation arrows
        const navButtons = $('.owl-nav button');
        console.log('[Scratch] Navigation buttons found:', navButtons.length);
        console.log('[Scratch] Prev button:', $('.owl-prev').length, 'Next button:', $('.owl-next').length);
        console.log('[Scratch] Nav container visible:', $('.owl-nav').is(':visible'));
        
        // Debug: Check for duplicates after Owl initialization
        const owlItems = $('.owl-item');
        const scratchCards = $('.scratch-card-individual');
        console.log('[Scratch] Owl items vs scratch cards:', owlItems.length, 'vs', scratchCards.length);
        
        if (owlItems.length !== scratchCards.length) {
          console.warn('[Scratch] WARNING: Owl items count mismatch! Owl items:', owlItems.length, 'Scratch cards:', scratchCards.length);
        }
        
        // Debug: Check for duplicate ticket numbers
        const ticketNumbers = scratchCards.map(function() {
          return $(this).data('ticket');
        }).get();
        const uniqueTickets = [...new Set(ticketNumbers)];
        console.log('[Scratch] Unique ticket numbers:', uniqueTickets.length, 'Total cards:', ticketNumbers.length);
        
        if (uniqueTickets.length !== ticketNumbers.length) {
          console.warn('[Scratch] WARNING: Duplicate ticket numbers detected!');
          console.log('[Scratch] All ticket numbers:', ticketNumbers);
        }
        
        // First restore auto-revealed cards
        console.log('[Scratch] Restoring auto-revealed cards first');
        restoreAutoRevealedCards();
        
        // Then initialize scratch circles for unrevealed cards
        setTimeout(function() {
          console.log('[Scratch] Initializing scratch circles for unrevealed cards');
          $('.scratch-card-individual').each(function(index) {
            initializeScratchCardCircles($(this), index);
          });
          
          // Show/hide navigation arrows again after initialization
          if (totalCards > 1) {
            setTimeout(function() {
              $('.scratch-slider-container .owl-nav').show();
              $('.scratch-slider-container .owl-nav button').show();
              console.log('[Scratch] Navigation arrows visible after initialization');
            }, 50);
          } else {
            setTimeout(function() {
              $('.scratch-slider-container .owl-nav').hide();
              $('.scratch-slider-container .owl-nav button').hide();
              console.log('[Scratch] Navigation arrows hidden after initialization');
            }, 50);
          }
          
          // Hide loading overlay after everything is ready
          setTimeout(function() {
            $('#scratch-slider-loading').fadeOut(500, function() {
              $(this).remove();
            });
            console.log('[Scratch] Loading overlay hidden');
            
            // Update remaining cards count after everything is loaded
            updateRemainingCardsCount();
          }, 200);
        }, 100);
      }
    });
  }
  
  function initializeScratchCardCircles($card, cardIndex) {
    console.log('[Scratch] Initializing scratch card circles:', cardIndex);
    
    const ticketNumber = $card.data('ticket');
    const $circles = $card.find('.scratch-circle');
    const $container = $card.find('.scratch-card-container');
    
    // Skip if card is already revealed
    if ($card.attr('data-revealed') === 'true' || $card.hasClass('revealed')) {
      console.log('[Scratch] Skipping revealed card:', ticketNumber);
      return;
    }
    
    // Store scratch data for this card
    if (!window.scratchCardsData) {
      window.scratchCardsData = {};
    }
    window.scratchCardsData[ticketNumber] = {
      circles: [],
      scratchedAreas: {}
    };
    
    // Initialize each circle canvas
    $circles.each(function(index) {
      const $circle = $(this);
      const canvas = $circle.find('.circle-canvas')[0];
      
      if (!canvas) {
        console.warn('[Scratch] No canvas found for circle:', index);
        return;
      }
      
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      canvas.width = 50;
      canvas.height = 50;
      
      // Draw gradient gray and silver background
      drawGradientBackground(ctx, canvas);
      
      // Store canvas data
      window.scratchCardsData[ticketNumber].circles[index] = {
        canvas: canvas,
        ctx: ctx,
        scratchedAreas: []
      };
      
      // Restore any saved progress
      restoreScratchProgress(canvas, ctx, ticketNumber, index);
    });
    
    // Add container-level scratch events for continuous scratching
    let isScratching = false;
    
    $container.on('mousedown touchstart', function(e) {
      // Check if card is already completed
      if ($card.attr('data-revealed') === 'true' || $card.hasClass('revealed') || $container.hasClass('scratching-disabled')) {
        console.log('[Scratch] Card already completed, scratching disabled');
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      isScratching = true;
      console.log('[Scratch] Started continuous scratching on container');
      
      // Scratch at current position
      scratchContainerAtPosition(e, $container, ticketNumber);
    });
    
    $container.on('mousemove touchmove', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (isScratching) {
        scratchContainerAtPosition(e, $container, ticketNumber);
      }
    });
    
    $container.on('mouseup touchend mouseleave', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (isScratching) {
        isScratching = false;
        console.log('[Scratch] Stopped continuous scratching on container');
        
        // Check completion for all circles
        checkCardScratchCompletion(ticketNumber);
      }
    });
  }
  
  function checkCircleScratchCompletion(canvas, ctx, ticketNumber, circleIndex) {
    console.log('[Scratch] Checking circle completion:', circleIndex, 'for ticket:', ticketNumber);
    
    // Get image data to check scratch percentage
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let transparentPixels = 0;
    const totalPixels = data.length / 4;
    
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) { // Alpha channel is 0 (transparent)
        transparentPixels++;
      }
    }
    
    const scratchPercentage = (transparentPixels / totalPixels) * 100;
    console.log('[Scratch] Circle scratch percentage:', scratchPercentage.toFixed(2) + '%');
    
    // If more than 30% is scratched, consider it complete (lowered from 50%)
    if (scratchPercentage > 30) {
      console.log('[Scratch] Circle completed:', circleIndex, 'with', scratchPercentage.toFixed(2) + '%');
      
      // Mark this circle as completed in the data structure
      if (window.scratchCardsData && window.scratchCardsData[ticketNumber] && window.scratchCardsData[ticketNumber].circles[circleIndex]) {
        window.scratchCardsData[ticketNumber].circles[circleIndex].completed = true;
      }
      
      // Clear the entire canvas to reveal the result
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Save progress
      saveScratchProgress(canvas, ctx, ticketNumber, circleIndex);
      
      // Check if all circles are completed
      checkCardScratchCompletion(ticketNumber);
    }
  }
  
  function checkCardScratchCompletion(ticketNumber) {
    console.log('[Scratch] Checking card completion for ticket:', ticketNumber);
    
    if (!window.scratchCardsData || !window.scratchCardsData[ticketNumber]) {
      console.warn('[Scratch] No scratch data found for ticket:', ticketNumber);
      return;
    }
    
    const cardData = window.scratchCardsData[ticketNumber];
    const totalCircles = cardData.circles.length;
    let completedCircles = 0;
    
    // Check each circle
    cardData.circles.forEach((circleData, index) => {
      if (circleData && circleData.canvas) {
        // Check if circle is marked as completed
        if (circleData.completed) {
          completedCircles++;
          console.log('[Scratch] Circle', index, 'is marked as completed');
        } else {
          // Fallback: check canvas pixels for circles not yet marked
          const ctx = circleData.ctx;
          const imageData = ctx.getImageData(0, 0, circleData.canvas.width, circleData.canvas.height);
          const data = imageData.data;
          
          let transparentPixels = 0;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] === 0) {
              transparentPixels++;
            }
          }
          
          const scratchPercentage = (transparentPixels / (data.length / 4)) * 100;
          if (scratchPercentage > 30) {
            completedCircles++;
            console.log('[Scratch] Circle', index, 'completed by pixel check:', scratchPercentage.toFixed(2) + '%');
          }
        }
      }
    });
    
    console.log('[Scratch] Completed circles:', completedCircles, 'of', totalCircles);
    
    // If all circles are completed, reveal the card
    if (completedCircles >= totalCircles) {
      console.log('[Scratch] All circles completed! Revealing card:', ticketNumber);
      
      const $card = $(`.scratch-card-individual[data-ticket="${ticketNumber}"]`);
      const isWin = $card.find('.ticket-result-new').hasClass('win');
      
      // Get prize from win content or from ticket data
      let prize = '';
      if (isWin) {
        // Try to get from win-content first
        prize = $card.find('.win-content').first().text().trim();
        
        // If no prize in win-content, try to get from ticket data
        if (!prize) {
          const ticketData = currentProduct.tickets.find(t => t.number == ticketNumber);
          if (ticketData && ticketData.prize) {
            prize = ticketData.prize;
          }
        }
        
        // If still no prize, use default win message
        if (!prize) {
          prize = '🎁 Prize';
        }
      }
      
      // Reveal the card (same as auto-reveal)
      revealCurrentCard($card, isWin, prize);
      
      // Clear scratch progress for this card
      clearScratchProgress(ticketNumber);
      
      // Show win notification and play win sound if it's a win
      if (isWin) {
        showAutoRevealWinNotification(prize);
        
        // Play win sound (same as auto-reveal button)
        try {
          if (gameSounds && gameSounds.winning) {
            gameSounds.winning.play().then(() => {
              console.log('[Scratch] Win sound played successfully for scratched card');
            }).catch((error) => {
              console.log('[Scratch] Error playing win sound:', error.message);
              // Fallback to scratch sound if win sound fails
              playScratchSound();
            });
          } else {
            console.log('[Scratch] Win sound not available, using scratch sound');
            playScratchSound();
          }
        } catch (error) {
          console.log('[Scratch] Error with win sound:', error.message);
          playScratchSound();
        }
      }
      
      // Update auto-reveal button state
      updateAutoRevealButtonState();
      
      // Update remaining cards count
      updateRemainingCardsCount();
      
      // Disable scratching for this card
      disableScratchingForCard($card);
    }
  }
  
  // Debounced save function to avoid too many saves
  const debouncedSaveProgress = (function() {
    const timeouts = {};
    return function(canvas, ctx, ticketNumber, circleId) {
      const key = `${ticketNumber}_${circleId}`;
      
      // Clear existing timeout
      if (timeouts[key]) {
        clearTimeout(timeouts[key]);
      }
      
      // Set new timeout to save after 100ms of no activity
      timeouts[key] = setTimeout(function() {
        try {
          // Get canvas data as base64
          const imageData = canvas.toDataURL();
          
          // Save to localStorage
          const storageKey = `scratch_progress_${ticketNumber}_${circleId}`;
          localStorage.setItem(storageKey, imageData);
          
          console.log('[Scratch] Debounced save completed for ticket:', ticketNumber, 'circle:', circleId);
        } catch (error) {
          console.error('[Scratch] Error saving progress:', error);
        }
      }, 100);
    };
  })();

  function saveScratchProgress(canvas, ctx, ticketNumber, circleId) {
    debouncedSaveProgress(canvas, ctx, ticketNumber, circleId);
  }
  
  function restoreScratchProgress(canvas, ctx, ticketNumber, circleId) {
    
    try {
      const key = `scratch_progress_${ticketNumber}_${circleId}`;
      const savedData = localStorage.getItem(key);
      
      console.log('[Scratch] Checking for saved progress - Key:', key, 'Found:', !!savedData);
      
      if (savedData) {
        // Create image from saved data
        const img = new Image();
        img.onload = function() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          console.log('[Scratch] Successfully restored progress for ticket:', ticketNumber, 'circle:', circleId);
        };
        img.src = savedData;
      } else {
        console.log('[Scratch] No saved progress found for ticket:', ticketNumber, 'circle:', circleId);
        // Draw default gradient background
        drawGradientBackground(ctx, canvas);
      }
    } catch (error) {
      console.error('[Scratch] Error restoring progress:', error);
    }
  }
  
  function clearScratchProgress(ticketNumber) {
    try {
      // Clear all scratch progress for this ticket
      for (let i = 0; i < 12; i++) { // 12 circles per card
        const key = `scratch_progress_${ticketNumber}_${i}`;
        localStorage.removeItem(key);
      }
      console.log('[Scratch] Cleared progress for ticket:', ticketNumber);
    } catch (error) {
      console.error('[Scratch] Error clearing progress:', error);
    }
  }
  
  function clearAllScratchProgress() {
    try {
      // Clear all scratch progress for all tickets
      if (currentProduct && currentProduct.tickets) {
        currentProduct.tickets.forEach(ticket => {
          clearScratchProgress(ticket.number);
        });
        console.log('[Scratch] Cleared all scratch progress for', currentProduct.tickets.length, 'tickets');
      } else {
        console.log('[Scratch] No current product or tickets available, clearing all scratch progress from localStorage');
      }
      
      // Also clear any scratch progress from localStorage that might not be in current product
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('scratch_progress_')) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      if (keysToRemove.length > 0) {
        console.log('[Scratch] Cleared additional scratch progress keys:', keysToRemove.length);
      }
      
    } catch (error) {
      console.error('[Scratch] Error clearing all scratch progress:', error);
    }
  }
  
  function drawGradientBackground(ctx, canvas) {
    // Draw gradient gray and silver background
    const gradient = ctx.createRadialGradient(25, 25, 0, 25, 25, 25);
    gradient.addColorStop(0, '#C0C0C0');   // Silver center
    gradient.addColorStop(0.7, '#A0A0A0'); // Light gray
    gradient.addColorStop(1, '#808080');   // Dark gray edge
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  
  function scratchContainerAtPosition(e, $container, ticketNumber) {
    // Get mouse/touch position relative to container
    const rect = $container[0].getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    console.log('[Scratch] Container position:', x, y);
    
    // Find which circle is under the cursor/touch
    const elementUnder = document.elementFromPoint(
      e.clientX || e.touches[0].clientX, 
      e.clientY || e.touches[0].clientY
    );
    
    const $circle = $(elementUnder).closest('.scratch-circle');
    if ($circle.length > 0) {
      const circleIndex = parseInt($circle.data('circle'));
      const canvas = $circle.find('.circle-canvas')[0];
      const ctx = canvas.getContext('2d');
      
      if (canvas && ctx) {
        // Get position relative to the specific circle canvas
        const circleRect = canvas.getBoundingClientRect();
        const circleX = (e.clientX || e.touches[0].clientX) - circleRect.left;
        const circleY = (e.clientY || e.touches[0].clientY) - circleRect.top;
        
        console.log('[Scratch] Scratching circle:', circleIndex, 'at position:', circleX, circleY);
        
        // Scratch the circle at this position
        scratchCircleAtPosition(circleX, circleY, ctx, canvas, window.scratchCardsData[ticketNumber].circles[circleIndex].scratchedAreas);
        
        // Auto-save progress after each scratch
        autoSaveScratchProgress(canvas, ctx, ticketNumber, circleIndex);
        
        // Check if this circle is completed
        console.log('[Scratch] Calling checkCircleScratchCompletion for circle:', circleIndex);
        checkCircleScratchCompletion(canvas, ctx, ticketNumber, circleIndex);
      }
    }
  }
  
  function scratchCircleAtPosition(x, y, ctx, canvas, scratchedAreas) {
    // Create scratch effect
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Track scratched area
    scratchedAreas.push({ x: x, y: y, radius: 15 });
  }
  
  function disableScratchingForCard($card) {
    console.log('[Scratch] Disabling scratching for completed card');
    
    // Remove all scratch event listeners from container
    const $container = $card.find('.scratch-card-container');
    $container.off('mousedown touchstart mousemove touchmove mouseup touchend mouseleave');
    
    // Add a visual indicator that scratching is disabled
    $container.addClass('scratching-disabled');
    
    // Optionally change cursor to indicate no more scratching
    $container.css('cursor', 'default');
    
    console.log('[Scratch] Scratching disabled for card');
  }
  
  function autoSaveScratchProgress(canvas, ctx, ticketNumber, circleIndex) {
    try {
      // Get canvas data as base64
      const imageData = canvas.toDataURL();
      
      // Save to localStorage immediately
      const key = `scratch_progress_${ticketNumber}_${circleIndex}`;
      localStorage.setItem(key, imageData);
      
      console.log('[Auto-Save] Saved progress to localStorage for ticket:', ticketNumber, 'circle:', circleIndex);
      
    } catch (error) {
      console.error('[Auto-Save] Error saving progress:', error);
    }
  }
  
  // Audio functionality for scratch sound
  
  function initScratchSound() {
    if (scratchAudio || scratchAudioFailed) return;
    
    try {
      const scratchUrl = instantWin.plugin_url + '/assets/sound/scratch-sound.mp3';
      console.log('[Audio] Initializing scratch sound:', scratchUrl);
      
      // Create audio context if not exists
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('[Audio] Audio context created:', audioContext.state);
      }
      
      scratchAudio = new Audio(scratchUrl);
      scratchAudio.preload = 'auto';
      scratchAudio.volume = 0.5;
      
      // Add event listeners
      scratchAudio.addEventListener('canplaythrough', function() {
        console.log('[Audio] Scratch sound loaded successfully');
        scratchAudioLoaded = true;
      });
      
      scratchAudio.addEventListener('error', function(e) {
        console.log('[Audio] Scratch sound file not found, audio disabled');
        scratchAudio = null;
        scratchAudioFailed = true;
      });
      
      // Force load the audio
      scratchAudio.load();
      
    } catch (error) {
      console.log('[Audio] Error initializing scratch sound:', error.message);
      scratchAudioFailed = true;
    }
  }
  
  function playScratchSound() {
    try {
      // Initialize audio if not done yet
      if (!scratchAudio && !scratchAudioFailed) {
        initScratchSound();
      }
      
      // Check if audio is ready to play
      if (scratchAudio && scratchAudioLoaded && scratchAudio.readyState >= 2) {
        // Reset audio to beginning and play
        scratchAudio.currentTime = 0;
        scratchAudio.play().then(() => {
          console.log('[Audio] Scratch sound played successfully');
        }).catch((error) => {
          console.log('[Audio] Error playing scratch sound:', error.message);
          // Try alternative method for autoplay restrictions
          if (error.name === 'NotAllowedError') {
            console.log('[Audio] Autoplay blocked, trying with user gesture...');
            // This will be handled by the click event
          }
        });
      } else if (scratchAudio && !scratchAudioLoaded) {
        // Audio is still loading, try to play anyway (browser might allow it)
        console.log('[Audio] Scratch sound still loading, attempting to play...');
        scratchAudio.currentTime = 0;
        scratchAudio.play().then(() => {
          console.log('[Audio] Scratch sound played successfully (while loading)');
        }).catch((error) => {
          console.log('[Audio] Could not play scratch sound while loading:', error.message);
          // Try to resume audio context if suspended
          if (scratchAudio.context && scratchAudio.context.state === 'suspended') {
            scratchAudio.context.resume().then(() => {
              console.log('[Audio] Audio context resumed, trying to play again...');
              scratchAudio.play().catch(e => {
                console.log('[Audio] Still cannot play after context resume:', e.message);
              });
            });
          }
        });
      } else if (scratchAudioFailed) {
        console.log('[Audio] Scratch sound not available (failed to load)');
      } else {
        console.log('[Audio] Scratch sound not ready');
      }
      
    } catch (error) {
      console.log('[Audio] Error with scratch sound:', error.message);
    }
  }
  
  function scratchCircle(e, ctx, canvas, scratchedAreas) {
    const rect = canvas.getBoundingClientRect();
    const x = e.offsetX || (e.clientX - rect.left);
    const y = e.offsetY || (e.clientY - rect.top);
    
    // Use the new scratch function
    scratchCircleAtPosition(x, y, ctx, canvas, scratchedAreas);
  }
  
  function revealAllScratchCards() {
    console.log('[Scratch] Revealing all scratch circles');
    
    $('.circle-canvas').each(function() {
      const canvas = this;
      const ctx = canvas.getContext('2d');
      
      // Clear the canvas to reveal the result underneath
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
    
    // Show completion notification
    showScratchCompletionNotification();
  }
  
  function saveScratchSliderProgress() {
    console.log('[Scratch] Saving scratch slider progress to localStorage');
    
    if (!window.scratchCardsData) {
      console.log('[Scratch] No scratch cards data available');
      return;
    }
    
    const progressData = {
      productId: currentProduct.product_id,
      cardsData: {},
      timestamp: Date.now()
    };
    
    // Collect scratched areas from all cards (circles)
    Object.keys(window.scratchCardsData).forEach(ticketNumber => {
      const cardData = window.scratchCardsData[ticketNumber];
      progressData.cardsData[ticketNumber] = {
        scratchedAreas: cardData.scratchedAreas
      };
    });
    
    // Save to localStorage instead of server
    try {
      localStorage.setItem('scratch_slider_progress', JSON.stringify(progressData));
      console.log('[Scratch] Slider progress saved to localStorage successfully');
      showProgressSavedNotification();
    } catch (error) {
      console.error('[Scratch] Error saving progress to localStorage:', error);
    }
  }
  
  function loadScratchSliderProgress() {
    console.log('[Scratch] Loading scratch slider progress from localStorage');
    
    try {
      const savedProgress = localStorage.getItem('scratch_slider_progress');
      
      if (savedProgress) {
        const progressData = JSON.parse(savedProgress);
        
        if (progressData.cardsData) {
          console.log('[Scratch] Restoring scratch progress for', Object.keys(progressData.cardsData).length, 'cards');
          
          // Restore scratch progress for each card (circles)
          Object.keys(progressData.cardsData).forEach(ticketNumber => {
            const cardData = progressData.cardsData[ticketNumber];
            if (window.scratchCardsData && window.scratchCardsData[ticketNumber]) {
              const scratchData = window.scratchCardsData[ticketNumber];
              
              // Restore each circle's scratch areas
              Object.keys(cardData.scratchedAreas).forEach(circleId => {
                const circleAreas = cardData.scratchedAreas[circleId];
                if (scratchData.circles[circleId]) {
                  const ctx = scratchData.circles[circleId].ctx;
                  
                  // Apply scratched areas
                  ctx.globalCompositeOperation = 'destination-out';
                  circleAreas.forEach(area => {
                    ctx.beginPath();
                    ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
                    ctx.fill();
                  });
                  ctx.globalCompositeOperation = 'source-over';
                  
                  // Update local scratch data
                  scratchData.circles[circleId].scratchedAreas = circleAreas;
                  scratchData.scratchedAreas[circleId] = circleAreas;
                }
              });
            }
          });
        }
      } else {
        console.log('[Scratch] No saved progress found in localStorage');
      }
    } catch (error) {
      console.error('[Scratch] Error loading progress from localStorage:', error);
    }
  }
  
  function showProgressSavedNotification() {
    const notification = $(`
      <div class="scratch-save-notification" style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      ">
        ✓ Progress Saved!
      </div>
    `);
    
    $('body').append(notification);
    
    setTimeout(() => {
      notification.fadeOut(300, function() {
        $(this).remove();
      });
    }, 2000);
  }
  
  function showScratchCompletionNotification() {
    const notification = $(`
      <div class="scratch-completion-notification" style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 1000;
        text-align: center;
        max-width: 400px;
      ">
        <h3 style="color: #28a745; margin-bottom: 15px;">🎉 All Cards Revealed!</h3>
        <p>Check your results and see what you've won!</p>
        <button onclick="$(this).closest('.scratch-completion-notification').remove()" 
                style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
          Continue Playing
        </button>
      </div>
    `);
    
    $('body').append(notification);
    
    setTimeout(() => {
      notification.fadeOut(300, function() {
        $(this).remove();
      });
    }, 5000);
  }
  
  function populateAllTicketResults() {
    console.log('[Scratch] Populating all ticket results');
    
    const resultsGrid = $('.tickets-results-grid');
    resultsGrid.empty();
    
    if (!currentProduct.tickets || currentProduct.tickets.length === 0) {
      resultsGrid.html('<p style="color:#666;text-align:center;grid-column:1/-1;">No tickets available</p>');
      return;
    }
    
    console.log('[Scratch] Total tickets to display:', currentProduct.tickets.length);
    
    // Create a wrapper div to ensure proper grid layout
    const gridWrapper = $('<div class="tickets-grid-wrapper" style="width:100%;height:100%;"></div>');
    
    currentProduct.tickets.forEach((ticket, index) => {
      const isWin = ticket.status === 'WIN';
      const prize = ticket.prize || '';
      const ticketNumber = ticket.number;
      
      // Find prize image if available
      let prizeImage = '';
      if (isWin && prize && allPrizes && allPrizes.length > 0) {
        const prizeObj = allPrizes.find(p => {
          if (typeof p === 'string') {
            return p === prize;
          } else if (p && p.name) {
            return p.name === prize;
          }
          return false;
        });
        
        if (prizeObj && typeof prizeObj === 'object' && prizeObj.image) {
          prizeImage = prizeObj.image;
        }
      }
      
      // Create individual ticket result card with fixed dimensions
      let resultContent = '';
      if (isWin) {
        if (prizeImage) {
          resultContent = `
            <div class="ticket-result win" data-ticket="${ticketNumber}">
              <div class="status-badge">WIN</div>
              <div style="color:#28a745;font-weight:bold;margin-bottom:2px;font-size:8px;">#${ticketNumber}</div>
              <img src="${prizeImage}" alt="${prize}" style="max-width:25px;max-height:20px;object-fit:contain;margin:0 auto 2px;" />
              <div style="color:#155724;font-weight:bold;font-size:7px;line-height:1.1;overflow:hidden;">${prize.length > 15 ? prize.substring(0, 12) + '...' : prize}</div>
            </div>
          `;
      } else {
          resultContent = `
            <div class="ticket-result win" data-ticket="${ticketNumber}">
              <div class="status-badge">WIN</div>
              <div style="color:#28a745;font-weight:bold;margin-bottom:2px;font-size:8px;">#${ticketNumber}</div>
              <div style="font-size:14px;color:#28a745;font-weight:bold;margin-bottom:2px;">🎉</div>
              <div style="color:#155724;font-weight:bold;font-size:7px;line-height:1.1;overflow:hidden;">${prize.length > 15 ? prize.substring(0, 12) + '...' : prize}</div>
            </div>
          `;
        }
      } else {
        resultContent = `
          <div class="ticket-result lose" data-ticket="${ticketNumber}">
            <div class="status-badge">LOSE</div>
            <div style="color:#dc3545;font-weight:bold;margin-bottom:2px;font-size:8px;">#${ticketNumber}</div>
            <div style="font-size:16px;color:#dc3545;margin-bottom:2px;">❌</div>
          </div>
        `;
      }
      
      gridWrapper.append(resultContent);
    });
    
    // Apply better grid CSS for displaying all tickets
    gridWrapper.css({
      'display': 'grid',
      'grid-template-columns': 'repeat(auto-fit, minmax(94px, 1fr))', // Better responsive columns
      'gap': '4px',
      'justify-content': 'start', // Align to start instead of center
      'align-content': 'start', // Align content to start
      'max-height': 'none', // Remove height restriction
      'overflow-y': 'visible', // Make sure all tickets are visible
      'padding': '5px',
      'width': '100%', // Ensure full width usage
      'box-sizing': 'border-box'
    });
    
    resultsGrid.css({
      'width': '100%',
      'height': 'auto',
      'min-height': '200px', // Minimum height to ensure visibility
      'display': 'block'
    });
    
    resultsGrid.append(gridWrapper);
    
    console.log('[Scratch] Successfully added', currentProduct.tickets.length, 'ticket results to grid');
    
    // Debug: Log the actual grid dimensions
        setTimeout(() => {
      const gridElement = $('.tickets-results-grid')[0];
      const wrapperElement = $('.tickets-grid-wrapper')[0];
      if (gridElement && wrapperElement) {
        console.log('[Scratch] Grid container dimensions:', gridElement.offsetWidth + 'x' + gridElement.offsetHeight);
        console.log('[Scratch] Grid wrapper dimensions:', wrapperElement.offsetWidth + 'x' + wrapperElement.offsetHeight);
        console.log('[Scratch] Grid children count:', wrapperElement.children.length);
        console.log('[Scratch] Grid computed style:', window.getComputedStyle(wrapperElement).gridTemplateColumns);
      }
    }, 50);
  }
  
  function initializeLargeScratchCard() {
    console.log('[Scratch] Initializing large scratch card');
    
    const canvas = document.getElementById('scratch-canvas');
    if (!canvas) {
      console.error('[Scratch] Canvas not found');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Create scratch overlay (silver coating)
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add scratch texture
    ctx.fillStyle = '#b8b8b8';
    const textureCount = Math.floor((canvas.width * canvas.height) / 3000); // Scale texture with canvas size
    for (let i = 0; i < textureCount; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() * 4 + 1;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Add "SCRATCH HERE" text (scale with canvas size)
    ctx.fillStyle = '#666';
    const fontSize = Math.max(20, Math.min(32, canvas.width / 25)); // Responsive font size
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('SCRATCH HERE', canvas.width / 2, canvas.height / 2 - 20);
    
    const smallFontSize = Math.max(14, Math.min(20, canvas.width / 35));
    ctx.font = `${smallFontSize}px Arial`;
    ctx.fillText(`to reveal all ${currentProduct.tickets.length} prizes!`, canvas.width / 2, canvas.height / 2 + 20);
    
    // Set up scratch functionality
    let isScratching = false;
    let scratchedAreas = []; // Track scratched areas for saving
    
    // Mouse events
    canvas.addEventListener('mousedown', startScratching);
    canvas.addEventListener('mousemove', scratch);
    canvas.addEventListener('mouseup', stopScratching);
    canvas.addEventListener('mouseleave', stopScratching);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      startScratching({ offsetX: x, offsetY: y });
    });
    
    canvas.addEventListener('touchmove', function(e) {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      scratch({ offsetX: x, offsetY: y });
    });
    
    canvas.addEventListener('touchend', function(e) {
      e.preventDefault();
      stopScratching();
    });
    
    function startScratching(e) {
      isScratching = true;
      scratch(e);
    }
    
    function scratch(e) {
      if (!isScratching) return;
      
      const rect = canvas.getBoundingClientRect();
      const x = e.offsetX || (e.clientX - rect.left);
      const y = e.offsetY || (e.clientY - rect.top);
      
      // Create scratch effect with appropriately sized brush for 50x50 circles
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2); // Smaller brush for 50x50 circles
      ctx.fill();
      
      // Track scratched area for saving
      scratchedAreas.push({ x: x, y: y, radius: 15 });
    }
    
    function stopScratching() {
      isScratching = false;
      ctx.globalCompositeOperation = 'source-over';
    }
    
    // Store scratch functions for saving/loading
    window.scratchFunctions = {
      applyScratchedAreas: function(areas) {
        ctx.globalCompositeOperation = 'destination-out';
        areas.forEach(area => {
          ctx.beginPath();
          ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalCompositeOperation = 'source-over';
      },
      getScratchedAreas: function() {
        return scratchedAreas;
      },
      clearScratchedAreas: function() {
        scratchedAreas = [];
      }
    };
  }
  

  

  
  function revealAllTickets() {
    console.log('[Scratch] Revealing all tickets');
    
    // Clear the canvas to reveal all results
    const canvas = document.getElementById('scratch-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Clear saved progress on server since everything is revealed
    $.ajax({
      url: instantWin.ajax_url,
      type: 'POST',
      data: {
        action: 'instantwin_clear_scratch_progress',
        nonce: instantWin.nonce,
        order_id: instantWin.order_id,
        product_id: currentProduct.product_id
      },
      success: function(response) {
        console.log('[Scratch] Server progress cleared:', response.success);
      },
      error: function(xhr, status, error) {
        console.error('[Scratch] Error clearing server progress:', error);
      }
    });
    
    // Clear local scratch functions
    if (window.scratchFunctions) {
      window.scratchFunctions.clearScratchedAreas();
    }
    
    // Play all tickets on server (for the first unplayed ticket to update counts)
    if (currentProduct.tickets.length > 0) {
      const firstTicket = currentProduct.tickets[0].number;
      
      playTicketSecurely(currentProduct.product_id, firstTicket)
        .done(function(response) {
          if (response.success) {
            console.log('[Security] Server validated ticket play:', response);
            
            // Mark all tickets as played (for display purposes)
            currentProduct.tickets = [];
            
            // Show summary notification
            setTimeout(() => {
              showScratchSummary();
            }, 1000);
          }
        })
        .fail(function(xhr, status, error) {
          console.error('[Security] Server error playing ticket:', error);
        });
    }
  }
  
  function showScratchSummary() {
    console.log('[Scratch] Showing scratch summary');
    
    // Count wins and losses from the displayed results
    const winTickets = $('.ticket-result.win').length;
    const loseTickets = $('.ticket-result.lose').length;
    const totalTickets = winTickets + loseTickets;
    
    let summaryMessage = '';
    let summaryColor = '';
    let summaryIcon = '';
    
    if (winTickets > 0) {
      summaryMessage = `${winTickets} WIN${winTickets > 1 ? 'S' : ''} out of ${totalTickets}`;
      summaryColor = '#27ae60';
      summaryIcon = '🎉';
    } else {
      summaryMessage = `${totalTickets} tickets - No wins this time`;
      summaryColor = '#e74c3c';
      summaryIcon = '❌';
    }
    
    // Create summary notification
    const notification = $(`
      <div class="scratch-summary-notification" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 25px 35px;
        border-radius: 15px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 100;
        border: 3px solid ${summaryColor};
        animation: slideInBounce 0.5s ease-out;
        max-width: 350px;
        font-family: Arial, sans-serif;
      ">
        <div style="font-size: 2.5em; margin-bottom: 10px;">${summaryIcon}</div>
        <div style="font-size: 1.2em; font-weight: bold; color: ${summaryColor}; margin-bottom: 5px;">
          ${summaryMessage}
        </div>
      </div>
    `);
    
    // Add notification to scratch container
    $('.scratch-container').css('position', 'relative').append(notification);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
      notification.css({
        'animation': 'fadeOutUp 0.5s ease-in',
        'animation-fill-mode': 'forwards'
      });
      
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 3500);
  }
  
  function startScratchReveal(isWin, prize, ticketUsed, serverResponse) {
    // This function is no longer needed with the new flow
    // Results are set directly when showing the scratch card
    console.log('[Scratch] startScratchReveal called (deprecated in new flow)');
  }
  
  function addScratchTestButtons() {
    // Test buttons removed for scratch game
    console.log('[Test] Test buttons disabled for scratch game');
  }
  
  function addTestTicket(isWin, prize) {
    // Test ticket functionality removed for scratch game
    console.log('[Test] Test tickets disabled for scratch game');
  }
  
  function testScratchResult(isWin, prize) {
    // Test result functionality removed for scratch game
    console.log('[Test] Test results disabled for scratch game');
  }
  
  function showScratchResult(isWin, prize) {
    console.log('[Scratch] Showing result - Win:', isWin, 'Prize:', prize);
    
    // Check if this is the final scratch (no more tickets)
    const isLastTicket = currentProduct.tickets.length === 0;
    
    // If this was the last ticket, automatically call instant reveal function
    if (isLastTicket) {
      console.log('[Scratch] Last ticket used, automatically calling instant reveal function...');
      
      // Show a message that instant reveal will be triggered
      const autoRevealMsg = $(`
        <div style="
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #007bff;
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          z-index: 10001;
          font-size: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        ">
          🎁 All tickets used! Showing final results...
        </div>
      `);
      $('body').append(autoRevealMsg);
      
      setTimeout(() => {
        autoRevealMsg.remove();
        // Call instant reveal function directly instead of clicking button
        callInstantRevealFunction();
      }, 2000); // Wait 2 seconds after showing the result
    }
    
    // Show result message
    let resultMessage = '';
    let resultColor = '';
    let resultIcon = '';
    
    if (isWin && prize && prize.trim() !== '') {
      resultMessage = prize; // Just show the prize value
      resultColor = '#27ae60'; // Green for win
      resultIcon = '🎉';
    } else {
      resultMessage = 'LOSE';
      resultColor = '#e74c3c'; // Red for lose
      resultIcon = '❌';
    }
    
    // Create in-game notification
    const notification = $(`
      <div class="scratch-notification" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 25px 35px;
        border-radius: 15px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 100;
        border: 3px solid ${resultColor};
        animation: slideInBounce 0.5s ease-out;
        max-width: 350px;
        font-family: Arial, sans-serif;
      ">
        <div style="font-size: 2.5em; margin-bottom: 10px;">${resultIcon}</div>
        <div style="font-size: 1.2em; font-weight: bold; color: ${resultColor}; margin-bottom: 5px;">
          ${resultMessage}
        </div>
      </div>
    `);
    
    // Add notification to scratch container (relative positioning)
    $('.scratch-container').css('position', 'relative').append(notification);
    
    // Auto-remove after 3 seconds with fade out
    setTimeout(() => {
      notification.css({
        'animation': 'fadeOutUp 0.5s ease-in',
        'animation-fill-mode': 'forwards'
      });
      
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 2500);
  }
  
  function populateSlotsReels() {
    console.log('[Slots] Populating reels with symbols');
    console.log('[Slots] Available prizes:', allPrizes);
    
    // Get all available symbols (prize images + losing symbols)
    const symbols = [];
    
    // Add prize symbols (from d_prize_image)
    if (allPrizes && allPrizes.length > 0) {
      allPrizes.forEach(prize => {
        // Handle both old format (string) and new format (object with name/image)
        if (typeof prize === 'string') {
          // Old format - just prize name
          symbols.push({
            type: 'prize',
            text: prize,
            name: prize
          });
        } else if (prize && prize.name) {
          // New format - object with name and image
          if (prize.image && prize.image.trim() !== '') {
            symbols.push({
              type: 'prize',
              image: prize.image,
              name: prize.name
            });
          } else {
            // Fallback to text if no image
            symbols.push({
              type: 'prize',
              text: prize.name,
              name: prize.name
            });
          }
        }
      });
    }
    
    // Add losing symbols (X or other symbols) - using text instead of images
    const losingSymbols = ['❌', '💥', '🚫', '⭕', '❎', '🔴'];
    losingSymbols.forEach(symbol => {
      symbols.push({
        type: 'lose',
        text: symbol,
        name: 'Lose'
      });
    });
    
    console.log('[Slots] Total symbols available:', symbols.length);
    
    // Populate each reel with symbols (create a long strip for spinning effect)
    for (let reelIndex = 0; reelIndex < 3; reelIndex++) {
      const reelStrip = $(`.reel[data-reel="${reelIndex}"] .reel-strip`);
      reelStrip.empty();
      
      // Create a long strip of symbols (repeat symbols multiple times)
      const stripLength = 20; // Number of symbols in the strip
      
      // Ensure different starting symbols for each reel to avoid initial matches
      const shuffledSymbols = [...symbols];
      for (let i = shuffledSymbols.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledSymbols[i], shuffledSymbols[j]] = [shuffledSymbols[j], shuffledSymbols[i]];
      }
      
      for (let i = 0; i < stripLength; i++) {
        const symbol = shuffledSymbols[i % shuffledSymbols.length];
        let symbolHTML = '';
        
        if (symbol.type === 'prize' && symbol.image) {
          symbolHTML = `<div class="symbol symbol-prize">
            <img src="${symbol.image}" alt="${symbol.name}" />
          </div>`;
        } else {
          symbolHTML = `<div class="symbol symbol-prize">
            ${symbol.text || '❌'}
          </div>`;
        }
        
        reelStrip.append(symbolHTML);
      }
    }
    
    console.log('[Slots] Reels populated successfully');
  }
  
  function startSlotsSpinAnimation(isWin, prize, ticketUsed, serverResponse) {
    console.log('[Slots] Starting spin animation - Win:', isWin, 'Prize:', prize);
    console.log('[Slots] Prize length:', prize ? prize.length : 'null/undefined');
    console.log('[Slots] Prize type:', typeof prize);
    
    // Reset spinning flag at the start of each spin
    window.slotsSpinningStarted = false;
    
    // Play spinning sound (only once per spin)
    if (!window.slotsSpinningStarted) {
    gameSounds.playSpinning();
      window.slotsSpinningStarted = true;
      
      // Stop spinning sound after max duration (longest animation is 1800ms + buffer)
      setTimeout(() => {
        gameSounds.stopSpinning();
        window.slotsSpinningStarted = false;
      }, 3000); // Stop after 3 seconds to cover full animation
    }
    
    // Determine target symbols for each reel
    let targetSymbols = [];
    
    if (isWin && prize && prize.trim() !== '') {
      // Find the prize symbol
      let prizeSymbol = null;
      if (allPrizes && allPrizes.length > 0) {
        console.log('[Slots] Looking for prize:', prize);
        console.log('[Slots] Available prizes:', allPrizes);
        
        prizeSymbol = allPrizes.find(p => {
          // Handle both old format (string) and new format (object)
          if (typeof p === 'string') {
            const match = p === prize;
            console.log('[Slots] Comparing string prize:', p, 'with:', prize, '=', match);
            return match;
          } else if (p && p.name) {
            const match = p.name === prize;
            console.log('[Slots] Comparing object prize name:', p.name, 'with:', prize, '=', match);
            return match;
          }
          return false;
        });
        
        console.log('[Slots] Found prize symbol:', prizeSymbol);
      }
      
      if (prizeSymbol) {
        // Check if it has an image
        if (typeof prizeSymbol === 'object' && prizeSymbol.image && prizeSymbol.image.trim() !== '') {
          // All 3 reels show the SAME winning symbol image
          targetSymbols = [prizeSymbol, prizeSymbol, prizeSymbol];
          console.log('[Slots] 🟢 NEW LOGIC: Win condition - all 3 reels will show same prize:', prize, 'with image');
          console.log('[Slots] 🟢 Target symbols for win:', targetSymbols);
        } else {
          // Use text version of the prize - all 3 reels same
          const textSymbol = {
            type: 'prize',
            text: typeof prizeSymbol === 'string' ? prizeSymbol : prizeSymbol.name,
            name: typeof prizeSymbol === 'string' ? prizeSymbol : prizeSymbol.name
          };
          targetSymbols = [textSymbol, textSymbol, textSymbol];
          console.log('[Slots] Win condition - all 3 reels will show same prize:', prize, 'as text');
        }
      } else {
        // Fallback: Create a prize symbol from the prize name if not found in allPrizes
        console.log('[Slots] Prize not found in allPrizes, creating fallback symbol for:', prize);
        
        // Decode the prize text to fix encoding issues
        let decodedPrize = prize;
        try {
          // Handle full Unicode sequences properly
          decodedPrize = prize.replace(/ud83cudf1f/gi, '⭐')  // Star emoji
                             .replace(/ud83eudea8/gi, '🪨')  // Rock emoji
                             .replace(/ud83cudf4d/gi, '🍍')  // Pineapple emoji
                             .replace(/ud83eudd65/gi, '🥥')  // Coconut emoji
                             .replace(/ud83cudf05/gi, '🌅')  // Sunset emoji
                             .replace(/ud83fudfbf/gi, '🗿')  // Tiki emoji
                             .replace(/ud83cudf1a/gi, '🐚')  // Shell emoji
                             .replace(/u2753/gi, '❓')      // Question mark emoji
                             .replace(/u00a3/gi, '£');      // Pound symbol
        } catch (e) {
          console.log('[Slots] Could not decode prize text, using original:', prize);
          console.log('[Slots] Decode error:', e.message);
        }
        
        // Try to find a matching prize by partial name match
        let bestMatch = null;
        if (allPrizes && allPrizes.length > 0) {
          // First, decode the prize name to get the actual text
          let decodedPrizeName = prize;
          try {
            decodedPrizeName = decodeURIComponent(JSON.parse('"' + prize.replace(/\"/g, '\\"') + '"'));
          } catch (e) {
            console.log('[Slots] Could not decode prize name for matching');
          }
          
          console.log('[Slots] Looking for match with decoded prize name:', decodedPrizeName);
          
          bestMatch = allPrizes.find(p => {
            if (typeof p === 'string') {
              // Extract key words from both strings for comparison
              const prizeWords = decodedPrizeName.toLowerCase().split(' ').filter(word => word.length > 2);
              const pWords = p.toLowerCase().split(' ').filter(word => word.length > 2);
              
              // Check if any key words match
              return prizeWords.some(word => pWords.includes(word));
            } else if (p && p.name) {
              // Extract key words from both strings for comparison
              const prizeWords = decodedPrizeName.toLowerCase().split(' ').filter(word => word.length > 2);
              const pWords = p.name.toLowerCase().split(' ').filter(word => word.length > 2);
              
              // Check if any key words match
              return prizeWords.some(word => pWords.includes(word));
            }
            return false;
          });
        }
        
        if (bestMatch) {
          console.log('[Slots] 🟢 Found partial match:', bestMatch);
          if (typeof bestMatch === 'object' && bestMatch.image && bestMatch.image.trim() !== '') {
            targetSymbols = [bestMatch, bestMatch, bestMatch];
            console.log('[Slots] 🟢 Using matched prize with image');
          } else {
            const textSymbol = {
              type: 'prize',
              text: typeof bestMatch === 'string' ? bestMatch : bestMatch.name,
              name: typeof bestMatch === 'string' ? bestMatch : bestMatch.name
            };
            targetSymbols = [textSymbol, textSymbol, textSymbol];
            console.log('[Slots] 🟢 Using matched prize as text');
          }
        } else {
          // No match found, use the decoded prize name as text
          const fallbackSymbol = {
            type: 'prize',
            text: decodedPrize,
            name: decodedPrize
          };
          targetSymbols = [fallbackSymbol, fallbackSymbol, fallbackSymbol];
          console.log('[Slots] 🟢 FALLBACK: Using decoded prize symbol for win:', decodedPrize);
        }
      }
    } else {
      // Losing combination - show different non-aligned prize symbols (not X)
      const availablePrizeSymbols = allPrizes.filter(prize => {
        if (typeof prize === 'object' && prize.image && prize.image.trim() !== '') {
          return true;
        }
        return false;
      });
      
      if (availablePrizeSymbols.length >= 2) {
        // Use different prize symbols for each reel to show non-alignment
        const symbol1 = availablePrizeSymbols[0];
        const symbol2 = availablePrizeSymbols[1];
        const symbol3 = availablePrizeSymbols.length > 2 ? availablePrizeSymbols[2] : availablePrizeSymbols[0];
        
        targetSymbols = [
          { type: 'prize', image: symbol1.image, name: symbol1.name },
          { type: 'prize', image: symbol2.image, name: symbol2.name },
          { type: 'prize', image: symbol3.image, name: symbol3.name }
        ];
        console.log('[Slots] 🔴 NEW LOGIC: Lose condition - showing non-aligned prize symbols');
      } else {
        // Fallback to different text symbols if no prize images
        const loseSymbols = ['🍒', '🍋', '🍊']; // Different symbols to show non-alignment
        targetSymbols = [
          { type: 'lose', text: loseSymbols[0] },
          { type: 'lose', text: loseSymbols[1] },
          { type: 'lose', text: loseSymbols[2] }
        ];
        console.log('[Slots] 🔴 Lose condition - showing non-aligned text symbols');
      }
      console.log('[Slots] 🔴 Target symbols for lose:', targetSymbols);
    }
    
    // Animate each reel with ultra-smooth animation
    const spinDurations = [1200, 1500, 1800]; // Much shorter durations to prevent sound restart
    let completedReels = 0;
    
    for (let reelIndex = 0; reelIndex < 3; reelIndex++) {
      const reel = $(`.reel[data-reel="${reelIndex}"] .reel-strip`);
      const targetSymbol = targetSymbols[reelIndex];
      
      // Remove any existing transitions for smooth start
      reel.css('transition', 'none');
      
      // Ultra-smooth spinning with requestAnimationFrame
      let startTime = null;
      const duration = spinDurations[reelIndex];
      const symbolHeight = 120; // Match CSS height of .symbol
      const totalSymbols = reel.find('.symbol').length;
      const totalHeight = symbolHeight * totalSymbols;
      
      function animateReel(currentTime) {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Use easing function for smooth deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
        
        // Calculate position with smooth deceleration
        const spinDistance = totalHeight * 3; // Spin 3 full cycles
        const currentOffset = -(spinDistance * easeOut) % totalHeight;
        
        reel.css('transform', `translateY(${currentOffset}px)`);
        
        if (progress < 1) {
          requestAnimationFrame(animateReel);
        } else {
          // Final smooth stop with easing
          reel.css('transition', 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)');
          reel.css('transform', 'translateY(0px)');
          
          // Update the first symbol to match target after smooth stop
          setTimeout(() => {
            const centerSymbol = reel.find('.symbol').eq(0);
            console.log(`[Slots] Reel ${reelIndex} - Target symbol:`, targetSymbol);
            
            if (targetSymbol.image && targetSymbol.image.trim() !== '') {
              console.log(`[Slots] Reel ${reelIndex} - Showing prize image:`, targetSymbol.image);
              centerSymbol.html(`<img src="${targetSymbol.image}" alt="${targetSymbol.name}" />`);
            } else {
              // Decode the text if it contains Unicode escape sequences
              let displayText = targetSymbol.text || '❌';
              try {
                if (displayText.includes('ud83c') || displayText.includes('u00a3') || displayText.includes('ud83e')) {
                  // Handle full Unicode sequences properly
                  displayText = displayText.replace(/ud83cudf1f/gi, '⭐')  // Star emoji
                                         .replace(/ud83eudea8/gi, '🪨')  // Rock emoji
                                         .replace(/ud83cudf4d/gi, '🍍')  // Pineapple emoji
                                         .replace(/ud83eudd65/gi, '🥥')  // Coconut emoji
                                         .replace(/ud83cudf05/gi, '🌅')  // Sunset emoji
                                         .replace(/ud83fudfbf/gi, '🗿')  // Tiki emoji
                                         .replace(/ud83cudf1a/gi, '🐚')  // Shell emoji
                                         .replace(/u2753/gi, '❓')      // Question mark emoji
                                         .replace(/u00a3/gi, '£');      // Pound symbol
                  
                  console.log(`[Slots] Reel ${reelIndex} - Decoded text:`, displayText);
                }
              } catch (e) {
                console.log(`[Slots] Reel ${reelIndex} - Could not decode text, using original:`, displayText);
                console.log(`[Slots] Reel ${reelIndex} - Decode error:`, e.message);
              }
              
              console.log(`[Slots] Reel ${reelIndex} - Showing text symbol:`, displayText);
              centerSymbol.html(displayText);
            }
            
            completedReels++;
            if (completedReels === 3) {
              // All reels stopped - add flashing effect to slots-reels container for wins
              if (isWin) {
                $('.slots-reels').addClass('winning-symbol-flash');
                
                // Remove the class after animation completes to allow re-triggering
                setTimeout(() => {
                  $('.slots-reels').removeClass('winning-symbol-flash');
                }, 2000); // 2 seconds = animation duration
              }
              
              // Show result
              setTimeout(() => {
                showSlotsResult(isWin, prize);
              }, 300);
            }
          }, 850); // Wait for smooth stop transition
        }
      }
      
      // Start the smooth animation
      requestAnimationFrame(animateReel);
    }
  }
  
  function showSlotsResult(isWin, prize) {
    console.log('[Slots] Showing result - Win:', isWin, 'Prize:', prize);
    
    // Stop spinning sound
    gameSounds.stopSpinning();
    
    // Re-enable spin button
    $('#instantwin-play-btn').prop('disabled', false).text('Spin');
    
    // Check if this is the final spin (no more tickets)
    const isLastTicket = currentProduct.tickets.length === 0;
    
          // If this was the last ticket, automatically call instant reveal function
      if (isLastTicket) {
        console.log('[Slots] Last ticket used, automatically calling instant reveal function...');
        
        // Show a message that instant reveal will be triggered
        const autoRevealMsg = $(`
          <div style="
            position: fixed;
            top: 20px;
          left: 50%;
            transform: translateX(-50%);
            background: #007bff;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10001;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          ">
            🎁 All tickets used! Showing final results...
        </div>
      `);
        $('body').append(autoRevealMsg);
      
      setTimeout(() => {
          autoRevealMsg.remove();
          // Call instant reveal function directly instead of clicking button
          callInstantRevealFunction();
        }, 2000); // Wait 2 seconds after showing the result
      }
    
    // Decode the prize name for display
    let displayPrize = prize;
    if (prize && (prize.includes('ud83c') || prize.includes('u00a3') || prize.includes('ud83e'))) {
      try {
        // Handle full Unicode sequences properly
        displayPrize = prize.replace(/ud83cudf1f/gi, '⭐')  // Star emoji
                           .replace(/ud83eudea8/gi, '🪨')  // Rock emoji
                           .replace(/ud83cudf4d/gi, '🍍')  // Pineapple emoji
                           .replace(/ud83eudd65/gi, '🥥')  // Coconut emoji
                           .replace(/ud83cudf05/gi, '🌅')  // Sunset emoji
                           .replace(/ud83fudfbf/gi, '🗿')  // Tiki emoji
                           .replace(/ud83cudf1a/gi, '🐚')  // Shell emoji
                           .replace(/u2753/gi, '❓')      // Question mark emoji
                           .replace(/u00a3/gi, '£');      // Pound symbol
        
        console.log('[Slots] Decoded prize for display:', displayPrize);
      } catch (e) {
        console.log('[Slots] Could not decode prize for display, using original:', prize);
        console.log('[Slots] Decode error:', e.message);
      }
    }
    
    // Add flashing effect for wins
    if (isWin && prize && prize.trim() !== '') {
      // Play winning sound
      gameSounds.playWinning();
      
      // Don't show individual win message on last ticket (final result popup will show)
      if (!isLastTicket) {
        // Show win notification (individual game win)
        console.log('[Slots] Creating win notification for:', displayPrize);
        const notification = $(`
          <div class="slots-notification win">
            <div class="notification-icon">Congrat! You're won:</div>
            <div class="notification-text">
              ${displayPrize}
          </div>
        </div>
      `);
      
        // Add notification to body (fixed positioning)
        $('body').append(notification);
        console.log('[Slots] Win notification added to body');
      
        // Auto-remove after 3 seconds with smooth fade out
      setTimeout(() => {
          notification.css({
            'transition': 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            'transform': 'translate(-50%, -50%) scale(0.9)',
            'opacity': '0'
        });
        
        setTimeout(() => {
            notification.remove();
          }, 600);
        }, 2500);
      } else {
        console.log('[Slots] Last ticket win - skipping individual notification (final popup will show)');
      }
      
    } else if (!isWin) {
      // Don't show lose message during play - only show when all tickets are used up
      console.log('[Slots] No win this time, but continuing to next play...');
    }
  }
  
  function startWheelSpin(targetPrize, ticketUsed, serverResponse) {
    console.log('[Game] Starting wheel spin with target:', targetPrize);
    
    // Play spinning sound
    gameSounds.playSpinning();
    
    if (!wheelInstance) {
      console.error('[Game] No wheel instance found');
      $('#instantwin-play-btn').prop('disabled', false).text('Spin the Wheel!');
      return;
    }
    
    $('#instantwin-play-btn').text('Spinning...');
    
    // Reset wheel state
    wheelInstance.stopAnimation(false);
    wheelInstance.rotationAngle = 0;
    wheelInstance.draw();
    
    // Find target segment (1-based indexing)
    let targetSegmentNumber = -1;
    if (wheelInstance.segments && wheelInstance.numSegments > 0) {
      for (let segmentNum = 1; segmentNum <= wheelInstance.numSegments; segmentNum++) {
        if (wheelInstance.segments[segmentNum] && wheelInstance.segments[segmentNum].text === targetPrize) {
          targetSegmentNumber = segmentNum;
          console.log('[Game] Found target segment:', segmentNum, 'for prize:', targetPrize);
          break;
        }
      }
    }
    
    if (targetSegmentNumber === -1) {
      console.error('[Game] Could not find segment for prize:', targetPrize);
      $('#instantwin-play-btn').prop('disabled', false).text('Spin');
      return;
    }
    
    // Calculate stop angle using official Winwheel method
    const randomForSegment = wheelInstance.getRandomForSegment(targetSegmentNumber);
    wheelInstance.animation.stopAngle = randomForSegment;
    
    console.log('[Game] Set stopAngle to:', wheelInstance.animation.stopAngle);
    
    // Set animation callback
    wheelInstance.animation.callbackFinished = function(indicatedSegment) {
      console.log('[Game] Animation finished - landed on:', indicatedSegment.text);
      
      // Stop spinning sound
      gameSounds.stopSpinning();
      
      // Update play history
      const lastPlay = playHistory[playHistory.length - 1];
      if (lastPlay && lastPlay.result === 'spinning') {
        const isWin = indicatedSegment.text !== 'X';
        lastPlay.result = isWin ? 'win' : 'lose';
        lastPlay.prize = isWin ? indicatedSegment.text : '';
        lastPlay.endTime = new Date().toISOString();
      }
      
      // Re-enable button
      $('#instantwin-play-btn').prop('disabled', false).text('Spin');
      
      saveGameState();
      showResultModal(indicatedSegment.text !== 'X', indicatedSegment.text);
    };
    
    // Start animation
    wheelInstance.startAnimation();
    console.log('[Game] Wheel animation started');
  }
  
  function showResultModal(isWin, prize) {
    console.log('[Game] Showing result modal - Win:', isWin, 'Prize:', prize);
    
    // Check if this is the final spin (no more tickets)
    const isLastTicket = currentProduct.tickets.length === 0;
    
    // If this was the last ticket, automatically call instant reveal function
    if (isLastTicket) {
      console.log('[Wheel] Last ticket used, automatically calling instant reveal function...');
      
      // Show a message that instant reveal will be triggered
      const autoRevealMsg = $(`
        <div style="
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #007bff;
          color: white;
          padding: 10px 20px;
          border-radius: 5px;
          z-index: 10001;
          font-size: 14px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        ">
          🎁 All tickets used! Showing final results...
        </div>
      `);
      $('body').append(autoRevealMsg);
      
      setTimeout(() => {
        autoRevealMsg.remove();
        // Call instant reveal function directly instead of clicking button
        callInstantRevealFunction();
      }, 2000); // Wait 2 seconds after showing the result
    }
    
    // Play winning sound if win
    if (isWin && prize !== 'X') {
      gameSounds.playWinning();
    }
    
    // Show result message
    let resultMessage = '';
    let resultColor = '';
    let resultIcon = '';
    
    if (isWin && prize !== 'X') {
      resultMessage = prize; // Just show the prize value
      resultColor = '#27ae60'; // Green for win
      resultIcon = '🎉';
    } else {
      resultMessage = 'LOSE';
      resultColor = '#e74c3c'; // Red for lose
      resultIcon = '❌';
    }
    
    // Only show win notifications during play, not lose notifications
    if (isWin && prize !== 'X') {
      // Don't show individual win message on last ticket (final result popup will show)
      if (!isLastTicket) {
        console.log('[Wheel] Creating win notification for:', resultMessage);
    const notification = $(`
          <div class="wheel-notification win" style="
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            background: white !important;
            padding: 50px 50px !important;
            border-radius: 15px !important;
            text-align: center !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
            z-index: 10000 !important;
            max-width: 450px !important;
            font-family: Arial, sans-serif !important;
            border: 3px solid #27ae60 !important;
          ">
            <div class="notification-icon" style="font-size: 24px !important; color: var(--color-content-primary) !important; font-weight: bold !important; margin-bottom: 10px !important;">Congrat! You're won:</div>
            <div class="notification-text" style="font-size: 24px !important; color: var(--color-header-middle-text) !important; font-weight: bold !important;">
          ${resultMessage}
        </div>
      </div>
    `);
    
        // Add notification to body (fixed positioning)
        $('body').append(notification);
        console.log('[Wheel] Win notification added to body');
    
    // Auto-remove after 3 seconds with fade out
    setTimeout(() => {
      notification.css({
        'animation': 'fadeOutUp 0.5s ease-in',
        'animation-fill-mode': 'forwards'
      });
      
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 2500);
      } else {
        console.log('[Wheel] Last ticket win - skipping individual notification (final popup will show)');
      }
    } else {
      // Don't show lose message during play - only show when all tickets are used up
      console.log('[Wheel] No win this time, but continuing to next play...');
    }
  }
  
  // Global function for closing win popup
  window.closeWinPopup = function() {
    $('#popup-overlay').remove();
    $('body').removeClass('popup-open');
    
    // Do exactly what back-to-lobby-top button does
    console.log('[Debug] Before hide - .instantwin-play-container count:', $('.instantwin-play-container').length);
    console.log('[Debug] Before hide - .instantwin-play-container visible:', $('.instantwin-play-container').is(':visible'));
    console.log('[Debug] Before hide - #instantwin-game-area count:', $('#instantwin-game-area').length);
    console.log('[Debug] Before hide - #instantwin-game-area visible:', $('#instantwin-game-area').is(':visible'));
    
    // Hide the specific container like back-to-lobby-top button does
    const $gameLobby = $('.game-lobby-page');
    const $container = $gameLobby.parent().find('#instantwin-game-area');
    
    console.log('[Debug] Found specific container count:', $container.length);
    console.log('[Debug] Specific container visible before hide:', $container.is(':visible'));
    
    // Check if all games are revealed
    const allRevealed = window.lastRevealedProducts && products && 
                       window.lastRevealedProducts.length === products.length;
    
    if (allRevealed) {
      // If all games revealed, hide the entire game area
      console.log('[Debug] All games revealed - hiding entire game area');
      $container.hide();
      $gameLobby.hide();
      $('.game-lobby-page').hide();
    } else {
      // If individual game revealed, do what back-to-lobby-top button does
      console.log('[Debug] Individual game revealed - returning to lobby');
      $container.hide();
      $gameLobby.show();
    }
    
    console.log('[Debug] Specific container visible after hide:', $container.is(':visible'));
    console.log('[Debug] Game lobby visible after action:', $gameLobby.is(':visible'));
    
    // Restore original header text
    const $existingHeader = $('.game-lobby-header');
    if ($existingHeader.length > 0) {
      $existingHeader.find('h6').text('Order confirmed');
      $existingHeader.find('h3').html("You've unlocked Instant Games 🎰 <span>Choose a game below:</span>");
      
      // Remove the back button from header
      $existingHeader.find('.back-to-lobby-top').remove();
    }
    
    // Refresh the lobby to show updated ticket counts
    showGameLobby();
  };
  
  // Process instant reveal results and show appropriate messages (only after ALL games finished)
  function processInstantRevealResults(response) {
    console.log('[InstantWin] Processing reveal results:', response);
    
    // Add loading animation to the entire game canvas
    $('#instantwin-game-canvas').addClass('processing-loading');
    
    // Update global revealed products list
    let isRevealAll = false; // Define outside the if block for scope
    
    if (response.data && response.data.revealed_products) {
      let revealedProducts = response.data.revealed_products;
      
      // Ensure it's always an array (handle object case from PHP)
      if (typeof revealedProducts === 'object' && !Array.isArray(revealedProducts)) {
        revealedProducts = Object.values(revealedProducts);
        console.log('[InstantWin] Converted server revealed products object to array:', revealedProducts);
      }
      
      window.lastRevealedProducts = revealedProducts;
      console.log('[InstantWin] Updated revealed products:', window.lastRevealedProducts);
      
      // Check if this was a "reveal all" (multiple products revealed)
      isRevealAll = window.lastRevealedProducts.length > 1 || 
                   (products && window.lastRevealedProducts.length === products.length);
      console.log('[InstantWin] Is reveal all?', isRevealAll, '- Revealed:', window.lastRevealedProducts.length, 'Total:', products ? products.length : 'undefined');
      
      if (isRevealAll) {
        // Update lobby to show all games as completed
        console.log('[InstantWin] Reveal all detected - updating lobby and disabling button');
        showGameLobby(); // Refresh lobby with updated revealed status
        
        // Change button to "View Results" so users can reopen popup
        $('.instant-reveal-trigger').prop('disabled', false).text('View Results').removeClass('completed-btn').addClass('view-results-btn');
        console.log('[InstantWin] Button changed to "View Results" for reopening popup');
      }
    }
    
    // Get wins data (can be empty array for no wins)
    let winsData = [];
    
    if (response.data && response.data.wins && response.data.wins.length > 0) {
      // Format wins data for the popup
      winsData = response.data.wins.map(win => ({
        name: win.product_name || 'Unknown Product',
        prizes: [{
          name: win.prize_name || 'Unknown Prize',
          ticket: win.ticket_number || 'Unknown'
        }]
      }));
    }
    
    // Note: Final results are now saved to order meta for "View Results" functionality
    console.log('[InstantWin] Final results saved to order meta for View Results popup');
    
    console.log('[InstantWin] Wins data for popup:', winsData);
    
    // Show unified popup for both wins and loses
    setTimeout(() => {
      console.log('[InstantWin] Showing popup with winsData:', winsData);
      showWinPopup(winsData);
      // Remove loading animation when popup shows
      $('#instantwin-game-canvas').removeClass('processing-loading');
    }, 500);
    
    // Only re-enable button if it wasn't a reveal all (to preserve disabled state)
    if (!isRevealAll) {
      $('.instant-reveal-trigger').prop('disabled', false).text('Instant Reveal');
      console.log('[InstantWin] Button re-enabled for individual reveal');
    } else {
      console.log('[InstantWin] Button remains disabled for reveal all');
    }
  }
  
  // --- Secure Entry Point ---
  console.log('[Security] Starting secure game initialization...');
  console.log('[Security] Game area element found:', $area.length > 0 ? 'YES' : 'NO');
  console.log('[Security] Game area selector:', '#instantwin-game-area');
  $area.html('<div class="loading">🔒 Loading game data from server...</div>');
  
  // Entry point: Load game data and initialize UI
  loadGameDataSecurely().then(function() {
    console.log('[Security] Game data loaded securely from server');
    console.log('[Security] Products loaded:', products.length);
    
    // Show actual ticket counts from server (not localStorage)
    products.forEach(function(product, idx) {
      console.log('[Security] Product', idx + 1, ':', product.title, '- Tickets remaining:', product.tickets.length);
    });
    
    // Check if all games are already revealed and change button to "View Results" if needed
    const revealedProducts = window.lastRevealedProducts || [];
    if (revealedProducts.length === products.length && products.length > 0) {
      console.log('[InstantWin] All games already revealed - changing button to "View Results"');
      $('.instant-reveal-trigger').prop('disabled', false).text('View Results').removeClass('completed-btn').addClass('view-results-btn');
    }
    
    // Always initialize with lobby first (even if single game) to show completion status
    console.log('[InstantWin] Always showing game lobby to display completion status');
    showGameLobby();
    
    // If single game and not revealed, can auto-start
    if (products.length === 1) {
      const revealedProducts = window.lastRevealedProducts || [];
      const singleProduct = products[0];
      const isRevealed = revealedProducts.includes(singleProduct.product_id);
      
      if (!isRevealed && singleProduct.tickets && singleProduct.tickets.length > 0) {
        console.log('[InstantWin] Single unrevealed game with tickets - can auto-start');
        // Don't auto-start, let user choose from lobby
      }
    }
    
    // Add functionality for the main reveal button (from PHP) - using event delegation for dynamic buttons
    // Old reveal-all-btn event handler removed - now using instant-reveal-trigger
    
  }).catch(function(error) {
    console.error('[Security] Failed to load secure game data:', error);
    $area.html('<div class="error">Failed to load game data. Please refresh the page.</div>');
  });
  
  // Test button function to refresh game data
  function addTestButton() {
    const testButton = $(`
      <button class="test-refresh-btn w-btn us-btn-style_1" style="
        padding: 10px 15px;
        font-size: 12px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        margin: 15px 0;
        display: block;
        width: 100%;
        max-width: 200px;
        opacity: 1;
        font-weight: 500;
      ">
        🔄 Refresh Game Data
      </button>
    `);
    
    // Enable click functionality
    testButton.click(function(e) {
  e.preventDefault();
      e.stopPropagation();
      refreshGameData();
    });
    
    // Try to add to game content area - look for common game containers
    // Try to add to woocommerce-order-details section
    let $targetContainer = $('.woocommerce-order-overview.woocommerce-thankyou-order-details');
    
    if ($targetContainer.length > 0) {
      // Add button after the order details list
      $targetContainer.after(testButton);
      console.log('[Test] Added refresh button to woocommerce-order-details');
    } else {
      // Fallback to body if order details not found
      $('body').prepend(testButton);
      console.log('[Test] No order details found, added button to body');
    }
    
    // Add hover effects
    testButton.hover(
      function() {
        $(this).css('transform', 'scale(1.05)');
      },
      function() {
        $(this).css('transform', 'scale(1)');
      }
    );
  }
  
  // Function to refresh game data from server
  function refreshGameData() {
    console.log('[Test] Resetting game data completely...');
    
    const $testBtn = $('.test-refresh-btn');
    $testBtn.prop('disabled', true).text('🔄 Resetting...');
    
    // First, reset the game data on server
    $.ajax({
      url: instantWin.ajax_url,
      type: 'POST',
      data: {
        action: 'instantwin_reset_game',
        order_id: instantWin.order_id,
        nonce: instantWin.nonce
      },
      dataType: 'json'
    }).done(function(response) {
      if (response.success) {
        console.log('[Test] Game reset successfully, now loading fresh data...');
        
        // Clear current data
        products = [];
        allPrizes = [];
        window.lastRevealedProducts = []; // Clear revealed products
        
        // Clear auto-reveal states for scratch cards
        console.log('[Test] Clearing auto-reveal states...');
        clearAutoRevealStates();
        
        // Clear all scratch progress from localStorage
        console.log('[Test] Clearing all scratch progress...');
        clearAllScratchProgress();
        
        // Now load fresh data from server
        $.ajax({
          url: instantWin.ajax_url,
          type: 'POST',
          data: {
            action: 'instantwin_get_game_data',
        order_id: instantWin.order_id,
        nonce: instantWin.nonce
          },
          dataType: 'json'
        }).done(function(response) {
          if (response.success) {
            products = response.tickets || [];
            allPrizes = response.prizes || [];
            window.lastRevealedProducts = response.revealed_products || [];
            
            console.log('[Test] Game data reset and loaded successfully:', products.length, 'products,', allPrizes.length, 'prizes');
            console.log('[Test] Revealed products after reset:', window.lastRevealedProducts);
            
            // Show success notification
            showNotification('✅ Game reset successfully! All tickets restored.', '#28a745');
            
            // Reset visual state of scratch cards before reload
            console.log('[Test] Resetting visual state of scratch cards...');
            $('.scratch-card-individual').each(function() {
              const $card = $(this);
              
              // Remove revealed classes and attributes
              $card.removeClass('revealed').removeAttr('data-revealed');
              $card.find('.ticket-result-new').removeClass('revealed');
              
              // Show canvas and hide content
              $card.find('.circle-canvas').show();
              $card.find('.circle-content').hide();
              
              // Re-enable scratch functionality
              $card.find('.scratch-circles-container').off('mousedown mousemove mouseup mouseleave');
              $card.find('.circle-canvas').off('mousedown mousemove mouseup mouseleave');
            });
            
            // Update auto-reveal button state (only if currentProduct exists)
            if (currentProduct && currentProduct.tickets) {
              updateAutoRevealButtonState();
            }
            
            // Update remaining cards count after reset (only if currentProduct exists)
            if (currentProduct && currentProduct.tickets) {
              updateRemainingCardsCount();
            }
            
            // Reload the page to show fresh game state
            console.log('[Test] Refreshing page to show fresh game state...');
            setTimeout(() => {
              window.location.reload();
            }, 1500); // 1.5 second delay to show the success message
            
          } else {
            console.error('[Test] Failed to load fresh game data:', response.error);
            showNotification('❌ Failed to load fresh data: ' + (response.error || 'Unknown error'), '#dc3545');
          }
        }).fail(function(xhr, status, error) {
          console.error('[Test] AJAX error loading fresh game data:', error);
          showNotification('❌ Network error loading fresh data', '#dc3545');
        });
        
      } else {
        console.error('[Test] Failed to reset game data:', response.error);
        showNotification('❌ Failed to reset game: ' + (response.error || 'Unknown error'), '#dc3545');
      }
    }).fail(function(xhr, status, error) {
      console.error('[Test] AJAX error resetting game data:', error);
      showNotification('❌ Network error resetting game', '#dc3545');
    }).always(function() {
      $testBtn.prop('disabled', false).text('🔄 Refresh Data');
    });
  }
  
  function addTestNotificationButton() {
    const testBtn = $(`
      <button id="test-notification-btn" style="
        padding: 8px 12px;
        font-size: 12px;
        border: 1px solid #ff6b6b;
        background: #ff6b6b;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        margin: 0 4px;
      ">
        🎯 Test Notifications
      </button>
    `);
    
    testBtn.on('click', function() {
      // Show test win notification (permanent)
      showTestNotification('win', '⭐ Golden Palm - £1000');
      
      // Show test lose notification (permanent)
      setTimeout(() => {
        showTestNotification('lose', 'Sorry, no win this time!');
      }, 1000);
    });
    
    // Add to slots test buttons container if it exists, otherwise to body
    const $slotsTestContainer = $('.slots-test-buttons');
    if ($slotsTestContainer.length > 0) {
      // Find the buttons row and add our button
      const $buttonsRow = $slotsTestContainer.find('div[style*="display:flex"]');
      if ($buttonsRow.length > 0) {
        $buttonsRow.append(testBtn);
      } else {
        $slotsTestContainer.append(testBtn);
      }
    } else {
      // Fallback to body if slots test container doesn't exist
      $('body').append(testBtn);
    }
  }
  
  // Add test button for auto-reveal
  function addAutoRevealTestButton() {
    const autoRevealBtn = $(`
      <button id="auto-reveal-test-btn" style="
        padding: 8px 12px;
        font-size: 12px;
        border: 1px solid #28a745;
        background: #28a745;
        color: white;
        border-radius: 4px;
        cursor: pointer;
        margin: 0 4px;
      ">
        ⚡ Trigger Auto-Reveal
      </button>
    `);
    
    autoRevealBtn.on('click', function() {
      console.log('[Test] Triggering auto-reveal manually...');
      
      $.post(instantWin.ajax_url, {
        action: 'instantwin_trigger_auto_reveal'
      })
      .done(function(response) {
        console.log('[Test] Auto-reveal response:', response);
        if (response.success) {
          showNotification('✅ Auto-reveal triggered successfully!', '#28a745');
        } else {
          showNotification('❌ Auto-reveal failed: ' + (response.data || 'Unknown error'), '#dc3545');
        }
      })
      .fail(function(xhr, status, error) {
        console.error('[Test] Auto-reveal AJAX error:', error);
        showNotification('❌ Auto-reveal AJAX error: ' + error, '#dc3545');
      });
    });
    
    // Add to slots test buttons container if it exists, otherwise to body
    const $slotsTestContainer = $('.slots-test-buttons');
    if ($slotsTestContainer.length > 0) {
      // Find the buttons row and add our button
      const $buttonsRow = $slotsTestContainer.find('div[style*="display:flex"]');
      if ($buttonsRow.length > 0) {
        $buttonsRow.append(autoRevealBtn);
      } else {
        $slotsTestContainer.append(autoRevealBtn);
      }
    } else {
      // Fallback to body if slots test container doesn't exist
      $('body').append(autoRevealBtn);
    }
  }
  
  function showWinPopup(winsData) {
    console.log('[InstantWin] showWinPopup called with winsData:', winsData);
    console.log('[InstantWin] winsData length:', winsData ? winsData.length : 'null');
    
    // Create popup overlay and content
    let popupHTML;
    
    // Remove back to lobby button - popup will auto-close and return to lobby
    
    if (winsData && winsData.length > 0) {
      console.log('[InstantWin] Creating WIN popup');
      
      // Play win sound for actual wins
      if (gameSounds && gameSounds.playWinning) {
        console.log('[InstantWin] Playing win sound for actual wins');
        gameSounds.playWinning();
      }
      // Win popup
      popupHTML = `
        <div id="popup-overlay">
          <div id="instant-win-popup">
            <button class="close-btn" onclick="closeWinPopup()">×</button>
            <p>🎉 <strong>Congratulations! You have won:</strong></p>
            
            ${winsData.map(product => `
              <div class="product-prizes">
                <div class="d-product-prizes">
                  <div>
                    <ul>
                      ${product.prizes.map(prize => `
                        <li>
                          <strong>${prize.name}</strong> with ticket number <strong>${prize.ticket}</strong>
                        </li>
                      `).join('')}
                    </ul>
                  </div>
                </div>
                <p class="d-won-p">Prize Won From: <span>${product.name}</span></p>
                <hr>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      console.log('[InstantWin] Creating LOSE popup');
      // Lose popup
      popupHTML = `
        <div id="popup-overlay">
          <div id="instant-win-popup">
            <button class="close-btn" onclick="closeWinPopup()">×</button>
            <p>😔 <strong>Sorry, no win this time!</strong></p>
            <p>Better luck next time!</p>
          </div>
        </div>
      `;
    }
    
    
    // Add popup to body
    $('body').append(popupHTML);
    console.log('[InstantWin] Popup HTML added to body');
    
    // Show popup
    $('#popup-overlay').show();

    $('#instant-win-popup').show();
    console.log('[InstantWin] Popup elements shown');
    
    // Prevent body scroll
    $('body').addClass('popup-open');
  }
  
  function closeWinPopup() {
    console.log('[InstantWin] closeWinPopup() called');
    $('#popup-overlay').remove();
    $('body').removeClass('popup-open');
    console.log('[InstantWin] Popup removed from DOM');
    
    // Do exactly what back-to-lobby-top button does
    console.log('[Debug] Before hide - .instantwin-play-container count:', $('.instantwin-play-container').length);
    console.log('[Debug] Before hide - .instantwin-play-container visible:', $('.instantwin-play-container').is(':visible'));
    console.log('[Debug] Before hide - #instantwin-game-area count:', $('#instantwin-game-area').length);
    console.log('[Debug] Before hide - #instantwin-game-area visible:', $('#instantwin-game-area').is(':visible'));
    
    // Hide the specific container like back-to-lobby-top button does
    const $gameLobby = $('.game-lobby-page');
    const $container = $gameLobby.parent().find('#instantwin-game-area');
    
    console.log('[Debug] Found specific container count:', $container.length);
    console.log('[Debug] Specific container visible before hide:', $container.is(':visible'));
    
    // Check if all games are revealed
    const allRevealed = window.lastRevealedProducts && products && 
                       window.lastRevealedProducts.length === products.length;
    
    if (allRevealed) {
      // If all games revealed, hide the entire game area
      console.log('[Debug] All games revealed - hiding entire game area');
      $container.hide();
      $gameLobby.hide();
      $('.game-lobby-page').hide();
    } else {
      // If individual game revealed, do what back-to-lobby-top button does
      console.log('[Debug] Individual game revealed - returning to lobby');
      $container.hide();
      $gameLobby.show();
    }
    
    console.log('[Debug] Specific container visible after hide:', $container.is(':visible'));
    console.log('[Debug] Game lobby visible after action:', $gameLobby.is(':visible'));
    
    // Restore original header text
    const $existingHeader = $('.game-lobby-header');
    if ($existingHeader.length > 0) {
      $existingHeader.find('h6').text('Order confirmed');
      $existingHeader.find('h3').html("You've unlocked Instant Games 🎰 <span>Choose a game below:</span>");
      
      // Remove the back button from header
      $existingHeader.find('.back-to-lobby-top').remove();
    }
    
    // Refresh the lobby to show updated ticket counts
    showGameLobby();
  }
  
  // Function to go back to game lobby
  function backToLobby() {
    console.log('[InstantWin] Going back to game lobby...');
    
    // Close the popup
    $('#popup-overlay').remove();
    $('body').removeClass('popup-open');
    
    // Hide current game screen
          $('.instantwin-game-modal').remove();
    $('.game-play-screen').hide();
    
    // Show the game lobby
    $('.game-lobby-page').show();
    
    console.log('[InstantWin] Back to lobby - current game hidden, lobby shown');
  }
  
  // Function to reveal all games (from lobby)
  function callInstantRevealAllFunction() {
    console.log('[InstantWin] Calling instant reveal all function...');
    
    // Add loading animation to the entire game canvas
    $('#instantwin-game-canvas').addClass('processing-loading');
    
    // Reveal all games using the auto reveal action
    $.post(instantWin.ajax_url, {
      action: 'instantwin_reveal_auto',
      order_id: instantWin.order_id,
      nonce: instantWin.nonce
    })
    .done(function(res) {
      console.log('[InstantWin] reveal all response:', res);
      if (res && res.success) {
        // Process the reveal results and show appropriate messages
        processInstantRevealResults(res);
      } else {
        const msg = res && res.data && res.data.msg
          ? res.data.msg
          : 'Error processing reveal all';
        console.error('[InstantWin] Error:', msg);
        // Remove loading animation on error
        $('#instantwin-game-canvas').removeClass('processing-loading');
        alert('Error: ' + msg);
      }
    })
    .fail(function(xhr, status, err) {
      console.error('[InstantWin] AJAX error:', status, err);
      // Remove loading animation on error
      $('#instantwin-game-canvas').removeClass('processing-loading');
      alert('Network error. Please try again.');
    });
  }

  // Function to call instant reveal functionality directly (without affecting button)
  function callInstantRevealFunction() {
    console.log('[InstantWin] Calling instant reveal function directly...');
    
    // Add loading animation to the entire game canvas
    $('#instantwin-game-canvas').addClass('processing-loading');
    
    // Get current product ID from the game context
    const currentProductId = currentProductIdx !== undefined && products[currentProductIdx] 
      ? products[currentProductIdx].product_id 
      : null;
    
    if (!currentProductId) {
      console.error('[Game] No current product ID found');
      alert('Error: Could not identify current game');
      $('#instantwin-game-canvas').removeClass('processing-loading');
      return;
    }
    
    console.log('[Game] Revealing product:', currentProductId);
    
    // Proceed with reveal for current product only
          $.post(instantWin.ajax_url, {
      action: 'instantwin_reveal_product',
      order_id: instantWin.order_id,
      product_id: currentProductId,
      nonce: instantWin.nonce
    })
          .done(function(res) {
      console.log('[InstantWin] product reveal response:', res);
            if (res && res.success) {
        // Process the reveal results and show appropriate messages
        processInstantRevealResults(res);
      } else {
        const msg = res && res.data && res.data.msg
          ? res.data.msg
          : 'Error processing reveal';
        console.error('[InstantWin] Error:', msg);
        // Remove loading animation on error
        $('#instantwin-game-canvas').removeClass('processing-loading');
      }
    })
          .fail(function(xhr, status, err) {
      console.error('[InstantWin] AJAX error:', status, err);
      // Remove loading animation on error
      $('#instantwin-game-canvas').removeClass('processing-loading');
    });
  }
  
  // Function to hide game after notification/popup is closed
  function hideGameAfterNotification() {
    console.log('[InstantWin] hideGameAfterNotification() called');
    console.log('[InstantWin] Notification/popup closed, now hiding current game...');
    
    // Hide only the play container, not the entire game area
    $('.instantwin-play-container').hide();
    console.log('[InstantWin] Play container hidden');
    
    // Mark current game as completed
    if (currentProductIdx !== undefined && products[currentProductIdx]) {
      const currentProduct = products[currentProductIdx];
      console.log('[InstantWin] Marking game as completed:', currentProduct.title);
      
      // Update the product card to show completed status
      const productCard = $(`.product-card[data-idx="${currentProductIdx}"]`);
      if (productCard.length > 0) {
        // Add completed styling
        productCard.addClass('game-completed');
        
        // Update the button text and disable it
        const playButton = productCard.find('.select-product-btn');
        playButton.text('✅ Completed').prop('disabled', true).addClass('completed-btn');
        
        // Update plays left to show completed
        const playsLeftElement = productCard.find('.game-plays');
        playsLeftElement.text('');
        
        console.log('[InstantWin] Game card updated to show completed status');
      }
    }
    
    // Always show the lobby (even for single games, so user can see completion status)
    $('.game-lobby-page').show();
    
    // Also ensure the game area is visible
    $('#instantwin-game-area').show();
    
    console.log('[InstantWin] Returning to lobby and showing completion status');
  }
  
  function showTestNotification(type, message) {
    const iconText = type === 'win' ? 'Congrat! You\'re won:' : '😔';
    const notification = $(`
      <div class="test-notification ${type}" style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 25px 35px;
        border-radius: 15px;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 350px;
        font-family: Arial, sans-serif;
        border: 3px solid ${type === 'win' ? '#27ae60' : '#e74c3c'};
      ">
        <div class="notification-icon" style="font-size: 2.5em; margin-bottom: 10px;">${iconText}</div>
        <div class="notification-text" style="font-size: 1.2em; font-weight: bold; color: ${type === 'win' ? '#27ae60' : '#e74c3c'}; margin-bottom: 5px;">
          ${message}
        </div>
        <button class="close-test-notification" style="
          position: absolute;
          top: 10px;
          right: 10px;
          background: #666;
          color: white;
          border: none;
          border-radius: 50%;
          width: 25px;
          height: 25px;
          cursor: pointer;
          font-size: 12px;
        ">×</button>
      </div>
    `);
    
    // Add close functionality
    notification.find('.close-test-notification').on('click', function() {
      notification.remove();
    });
    
    $('body').append(notification);
  }
  
  function showAutoRevealWinNotification(prize) {
    console.log('[Auto-Reveal] Showing win notification - Prize:', prize);
    
    // Decode the prize name for display
    let displayPrize = prize;
    if (prize && (prize.includes('ud83c') || prize.includes('u00a3') || prize.includes('ud83e'))) {
      try {
        // Handle full Unicode sequences properly
        displayPrize = prize.replace(/ud83cudf1f/gi, '⭐')  // Star emoji
                           .replace(/ud83eudea8/gi, '🪨')  // Rock emoji
                           .replace(/ud83cudf4d/gi, '🍍')  // Pineapple emoji
                           .replace(/ud83eudd65/gi, '🥥')  // Coconut emoji
                           .replace(/ud83cudf05/gi, '🌅')  // Sunset emoji
                           .replace(/ud83fudfbf/gi, '🗿')  // Tiki emoji
                           .replace(/ud83cudf1a/gi, '🐚')  // Shell emoji
                           .replace(/u2753/gi, '❓')      // Question mark emoji
                           .replace(/u00a3/gi, '£');      // Pound symbol
        
        console.log('[Auto-Reveal] Decoded prize for display:', displayPrize);
      } catch (e) {
        console.log('[Auto-Reveal] Could not decode prize for display, using original:', prize);
        console.log('[Auto-Reveal] Decode error:', e.message);
      }
    }
    
    // Show win notification (same style as slots game)
    console.log('[Auto-Reveal] Creating win notification for:', displayPrize);
    const notification = $(`
      <div class="slots-notification win">
        <div class="notification-icon">🎉 Congratulations! You won:</div>
        <div class="notification-text">
          ${displayPrize}
        </div>
      </div>
    `);
    
    // Add notification to body (fixed positioning)
    $('body').append(notification);
    console.log('[Auto-Reveal] Win notification added to body');
    
    // Auto-remove after 3 seconds with smooth fade out
    setTimeout(() => {
      notification.css({
        'transition': 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'transform': 'translate(-50%, -50%) scale(0.9)',
        'opacity': '0'
      });
      
      setTimeout(() => {
        notification.remove();
      }, 600);
    }, 2500);
  }
  
  // Function to show notification
  function showNotification(message, color) {
    const notification = $(`
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: slideInRight 0.5s ease-out;
      ">
        ${message}
      </div>
    `);
    
    $('body').append(notification);
    
    setTimeout(() => {
      notification.fadeOut(300, function() {
        $(this).remove();
      });
    }, 3000);
  }
});