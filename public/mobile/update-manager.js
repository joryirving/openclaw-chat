/**
 * Mobile Update Manager - Frontend Integration
 * 
 * This script provides the frontend interface for OTA updates.
 * Include this in your mobile app's HTML to enable update notifications.
 * 
 * Usage:
 * <script src="/mobile/update-manager.js"></script>
 * <script>
 *   // Initialize on page load
 *   MobileUpdateManager.init({
 *     autoCheck: true,
 *     showNotification: true
 *   });
 * </script>
 */

(function(window) {
  'use strict';

  const MobileUpdateManager = {
    // Configuration
    config: {
      autoCheck: true,
      showNotification: true,
      notificationElement: 'update-notification',
      checkInterval: 3600000, // 1 hour
      debug: false
    },

    // State
    currentBundle: null,
    availableUpdate: null,
    checkIntervalId: null,

    /**
     * Log message if debug mode is enabled
     */
    log: function(...args) {
      if (this.config.debug) {
        console.log('[UpdateManager]', ...args);
      }
    },

    /**
     * Check if running in a Capacitor/Cordova environment
     */
    isNativePlatform: function() {
      return !!(window.Capacitor || window.Cordova);
    },

    /**
     * Initialize the update manager
     * @param {Object} options - Configuration options
     */
    init: async function(options = {}) {
      // Merge options with defaults
      Object.assign(this.config, options);
      
      this.log('Initializing update manager...');

      if (!this.isNativePlatform()) {
        this.log('Not running on native platform, skipping initialization');
        return;
      }

      try {
        // Wait for device ready if using Cordova
        if (window.Cordova && !window.Capacitor) {
          await new Promise((resolve) => {
            document.addEventListener('deviceready', resolve, { once: true });
            // Timeout after 5 seconds
            setTimeout(resolve, 5000);
          });
        }

        // Get current bundle info
        this.currentBundle = await this.getCurrentBundle();
        this.log('Current bundle:', this.currentBundle);

        // Check for updates if enabled
        if (this.config.autoCheck) {
          await this.checkForUpdate();
          
          // Set up periodic checking
          if (this.config.checkInterval > 0) {
            this.checkIntervalId = setInterval(() => {
              this.checkForUpdate();
            }, this.config.checkInterval);
          }
        }
      } catch (error) {
        console.error('[UpdateManager] Initialization error:', error);
      }
    },

    /**
     * Get current bundle information
     */
    getCurrentBundle: async function() {
      if (!window.Capacitor || !window.CapgoUpdater) {
        return null;
      }

      try {
        return await window.CapgoUpdater.getCurrent();
      } catch (error) {
        this.log('Error getting current bundle:', error);
        return null;
      }
    },

    /**
     * Check for available updates
     */
    checkForUpdate: async function() {
      if (!this.isNativePlatform()) {
        return { available: false };
      }

      try {
        // Check with Capgo for available updates
        if (window.CapgoUpdater) {
          const info = await window.CapgoUpdater.check();
          
          if (info && info.available) {
            this.availableUpdate = info;
            this.log('Update available:', info);
            
            if (this.config.showNotification) {
              this.showUpdateNotification(info);
            }
            
            return { available: true, info };
          }
        }

        return { available: false };
      } catch (error) {
        this.log('Error checking for update:', error);
        return { available: false, error: error.message };
      }
    },

    /**
     * Download available update
     */
    downloadUpdate: async function() {
      if (!this.availableUpdate) {
        return { success: false, reason: 'No update available' };
      }

      try {
        const result = await window.CapgoUpdater.download();
        this.log('Download result:', result);
        
        if (result) {
          return { success: true, bundleId: result.id };
        }
        
        return { success: false, reason: 'Download failed' };
      } catch (error) {
        this.log('Error downloading update:', error);
        return { success: false, reason: error.message };
      }
    },

    /**
     * Install downloaded update
     */
    installUpdate: async function(bundleId) {
      try {
        await window.CapgoUpdater.set({ bundleId });
        this.log('Update installed, restart required');
        return { success: true };
      } catch (error) {
        this.log('Error installing update:', error);
        return { success: false, reason: error.message };
      }
    },

    /**
     * Download and install update in one step
     */
    update: async function() {
      try {
        const result = await window.CapgoUpdater.downloadAndSet();
        this.log('Update result:', result);
        return { success: true, bundleId: result?.id };
      } catch (error) {
        this.log('Error updating:', error);
        return { success: false, reason: error.message };
      }
    },

    /**
     * Show update notification UI
     */
    showUpdateNotification: function(updateInfo) {
      const notificationEl = document.getElementById(this.config.notificationElement);
      
      if (notificationEl) {
        // Show existing notification
        notificationEl.style.display = 'block';
        notificationEl.classList.add('visible');
      } else {
        // Create notification element
        this.createNotificationElement(updateInfo);
      }
    },

    /**
     * Create notification element
     */
    createNotificationElement: function(updateInfo) {
      const notification = document.createElement('div');
      notification.id = this.config.notificationElement;
      notification.className = 'update-notification';
      notification.innerHTML = `
        <div class="update-notification-content">
          <h3>New Update Available</h3>
          <p>A new version of the app is available for download.</p>
          <div class="update-actions">
            <button id="update-later-btn" class="update-btn-secondary">Later</button>
            <button id="update-now-btn" class="update-btn-primary">Update Now</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Add event listeners
      document.getElementById('update-now-btn').addEventListener('click', () => {
        this.handleUpdateNow();
      });
      
      document.getElementById('update-later-btn').addEventListener('click', () => {
        this.hideUpdateNotification();
      });
    },

    /**
     * Hide update notification
     */
    hideUpdateNotification: function() {
      const notificationEl = document.getElementById(this.config.notificationElement);
      if (notificationEl) {
        notificationEl.classList.remove('visible');
        setTimeout(() => {
          notificationEl.style.display = 'none';
        }, 300);
      }
    },

    /**
     * Handle update now button click
     */
    handleUpdateNow: async function() {
      const updateBtn = document.getElementById('update-now-btn');
      if (updateBtn) {
        updateBtn.disabled = true;
        updateBtn.textContent = 'Downloading...';
      }

      try {
        const result = await this.update();
        
        if (result.success) {
          // Show success message
          const notificationEl = document.getElementById(this.config.notificationElement);
          if (notificationEl) {
            notificationEl.innerHTML = `
              <div class="update-notification-content">
                <h3>Update Ready</h3>
                <p>The update has been downloaded. The app will restart to apply the update.</p>
              </div>
            `;
          }
          
          // Restart app after a short delay
          setTimeout(() => {
            if (window.Capacitor && window.Capacitor.App) {
              window.Capacitor.App.exitApp();
            } else if (navigator.app) {
              navigator.app.exitApp();
            }
          }, 2000);
        } else {
          // Show error
          updateBtn.disabled = false;
          updateBtn.textContent = 'Update Now';
          alert('Failed to download update: ' + result.reason);
        }
      } catch (error) {
        updateBtn.disabled = false;
        updateBtn.textContent = 'Update Now';
        alert('Error updating: ' + error.message);
      }
    },

    /**
     * List all available bundles
     */
    listBundles: async function() {
      try {
        const bundles = await window.CapgoUpdater.list();
        return bundles || [];
      } catch (error) {
        this.log('Error listing bundles:', error);
        return [];
      }
    },

    /**
     * Delete a bundle by ID
     */
    deleteBundle: async function(bundleId) {
      try {
        await window.CapgoUpdater.delete({ bundleId });
        return { success: true };
      } catch (error) {
        this.log('Error deleting bundle:', error);
        return { success: false, reason: error.message };
      }
    },

    /**
     * Clean up old bundles (keep only the last N bundles)
     */
    cleanupBundles: async function(maxBundles = 3) {
      const bundles = await this.listBundles();
      
      if (bundles.length <= maxBundles) {
        return { deleted: 0 };
      }
      
      // Sort by created date (oldest first)
      bundles.sort((a, b) => new Date(a.created) - new Date(b.created));
      
      // Delete oldest bundles
      const toDelete = bundles.slice(0, bundles.length - maxBundles);
      let deleted = 0;
      
      for (const bundle of toDelete) {
        try {
          await this.deleteBundle(bundle.id);
          deleted++;
        } catch (error) {
          this.log('Failed to delete bundle:', bundle.id, error);
        }
      }
      
      return { deleted };
    },

    /**
     * Destroy the update manager and clean up
     */
    destroy: function() {
      if (this.checkIntervalId) {
        clearInterval(this.checkIntervalId);
        this.checkIntervalId = null;
      }
      
      const notificationEl = document.getElementById(this.config.notificationElement);
      if (notificationEl) {
        notificationEl.remove();
      }
    }
  };

  // Expose to global scope
  window.MobileUpdateManager = MobileUpdateManager;

  // Auto-initialize if data attribute is present
  document.addEventListener('DOMContentLoaded', () => {
    const autoInitEl = document.querySelector('[data-update-auto-init]');
    if (autoInitEl) {
      const config = JSON.parse(autoInitEl.dataset.updateConfig || '{}');
      MobileUpdateManager.init(config);
    }
  });

})(window);