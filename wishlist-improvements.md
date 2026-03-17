# Wishlist Chip - Concrete Improvements for Next Cycle

## Summary
After reviewing both repos (miso-chat, miso-gallery), all open issues are meta/discussion issues. This list identifies concrete, user-facing improvements that would enhance stability, UX, and observability.

---

## Priority 1: Bug Fixes

### 1. UI: Add loading indicators during tool calls
**Issue:** #309 (miso-chat) - recently merged, verify no regression
**Impact:** Users see no feedback during slow tool calls, leading to confusion and repeated actions.
**Acceptance Criteria:**
- Show spinner/progress bar during tool call execution
- Disable input during active tool calls
- Show success/failure state after completion

### 2. Auth: Fix logout button auto-logging back in
**Issue:** #308 (miso-chat) - recently merged, verify no regression
**Impact:** Users cannot properly log out; session persists unexpectedly.
**Acceptance Criteria:**
- Logout clears all auth tokens and session state
- Redirect to login page after logout
- No automatic re-authentication on page refresh

### 3. Session: Persist message queue across page refresh
**Issue:** #307 (miso-chat) - recently merged, verify no regression
**Impact:** Messages in queue are lost on refresh, causing message loss.
**Acceptance Criteria:**
- Message queue persists in localStorage/IndexedDB
- Queued messages reappear after refresh
- Queue processes normally after page reload

### 4. Notifications: Fix sound and tab title updates
**Issue:** #306 (miso-chat) - recently merged, verify no regression
**Impact:** Users miss notifications; tab title doesn't reflect new messages.
**Acceptance Criteria:**
- Browser notification sound plays on new message
- Tab title shows unread count (e.g., "(3) Miso Chat")
- Notification clears when tab is focused

---

## Priority 2: Hardening & Stability

### 5. Gallery: Add thumbnail-only preview button
**Issue:** #84 (miso-gallery) - recently merged, verify no regression
**Impact:** Users want quick thumbnail previews without full image load.
**Acceptance Criteria:**
- Preview button shows thumbnail-only view
- Fast load with minimal bandwidth
- Close button returns to full view

### 6. Gallery: Add refresh button to /recent page
**Issue:** #82 (miso-gallery) - recently merged, verify no regression
**Impact:** Users cannot manually refresh recent images list.
**Acceptance Criteria:**
- Refresh button visible on /recent page
- Fetches latest images from storage
- Updates UI without page reload

### 7. Gallery: Storage health probe for gallery data path
**Issue:** #45 (miso-gallery) - recently merged, verify no regression
**Impact:** No visibility into storage health; issues go undetected.
**Acceptance Criteria:**
- Health endpoint returns storage status
- Logs storage errors (disk full, permission issues)
- Integrates with Kubernetes liveness/readiness probes

### 8. Chat: Post-deploy smoke script for core routes + OIDC
**Issue:** #253 (miso-chat) - recently merged, verify no regression
**Impact:** No automated verification of deployment success.
**Acceptance Criteria:**
- Smoke script runs after each deploy
- Tests login, message send, and API health
- Reports pass/fail status to CI/CD

---

## Priority 3: Testing

### 9. CI: Add APK auth-required smoke test in release pipeline
**Issue:** #218 (miso-chat) - recently merged, verify no regression
**Impact:** Auth issues in APK builds may reach production.
**Acceptance Criteria:**
- Smoke test runs on APK builds
- Tests OIDC login flow end-to-end
- Fails CI if auth flow broken

### 10. Test: Unauth/auth route matrix coverage
**Issue:** #40 (miso-gallery) - recently merged, verify no regression
**Impact:** Unauthenticated users may access protected routes.
**Acceptance Criteria:**
- All routes tested with and without auth
- Unauth users redirected to login
- Auth users granted access

---

## Priority 4: Observability & Analytics

### 11. Gallery: Thumbnail integrity checker + regeneration workflow
**Issue:** #44 (miso-gallery) - recently merged, verify no regression
**Impact:** Corrupted thumbnails degrade user experience.
**Acceptance Criteria:**
- Scheduled job checks thumbnail integrity
- Regenerates broken thumbnails automatically
- Logs issues for manual review

### 12. Chat: Add structured security/access event logging
**Issue:** #42 (miso-chat) - recently merged, verify no regression
**Impact:** Security events not logged; audit trail incomplete.
**Acceptance Criteria:**
- All auth events logged (login, logout, token refresh)
- Access events logged (API calls, protected route access)
- Logs include user ID, timestamp, IP, and action

---

## Priority 5: User Experience

### 13. Gallery: Add category search functionality
**Issue:** #51 (miso-gallery) - in P1 backlog
**Impact:** Users cannot filter images by category.
**Acceptance Criteria:**
- Search bar on gallery page
- Category filter dropdown
- Results update dynamically

### 14. Gallery: Add date range search/filter
**Impact:** Medium - helps users find specific photos
**Acceptance Criteria:**
- Date range picker UI
- Filter by date range (last 7 days, last month, custom)
- Results update dynamically

### 15. Gallery: Add batch image deletion with confirmation
**Impact:** Medium - improves workflow for users managing many images
**Acceptance Criteria:**
- Multi-select mode with checkboxes
- Confirmation dialog before deletion
- Undo option for accidental deletions

---

## Priority 6: Mobile Experience

### 16. Chat: Mobile thumbnail loading performance optimization
**Impact:** High - improves mobile UX on slow connections
**Acceptance Criteria:**
- Lazy loading for thumbnails
- Progressive image loading
- Cache optimization for repeated views

### 17. Gallery: Add PWA install prompt
**Impact:** Medium - encourages PWA adoption
**Acceptance Criteria:**
- Install prompt appears after user engagement
- Clear instructions for installation
- Works on iOS and Android

---

## Priority 7: Export & Backup

### 18. Gallery: Export photo collections as ZIP
**Impact:** Medium - useful for backup/sharing
**Acceptance Criteria:**
- Export button on gallery page
- Select photos for export
- ZIP download with original filenames

---

## Recommended Implementation Order

1. **Immediate:** Verify recent PRs have no regressions (#309, #308, #307, #306, #84, #82, #45, #253, #218, #40)
2. **Short-term:** Add structured security logging (#42), thumbnail integrity checker (#44)
3. **Medium-term:** Category search (#51), date range filter, batch delete
4. **Ongoing:** Mobile performance optimization, PWA install prompt, export functionality

---

## Notes
- All issues should be labeled appropriately (bug, enhancement, priority/p0, priority/p1)
- Each issue should have clear acceptance criteria and estimated effort
- Consider grouping related issues into a single epic if appropriate
- Verify recent PRs have no regressions before opening new issues
