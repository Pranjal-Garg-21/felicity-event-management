# UI Testing Checklist

## Pre-Launch Testing

### Landing Page (/)
- [ ] Page loads with purple gradient background
- [ ] Three role cards display correctly (Admin, Organizer, Participant)
- [ ] Cards have hover effect (rise up on hover)
- [ ] Emoji icons display correctly
- [ ] Clicking each card navigates to login
- [ ] If already logged in, redirects to appropriate dashboard

### Login Page (/login)
- [ ] Page loads with purple gradient background
- [ ] Login card is centered
- [ ] Email and password inputs work
- [ ] Input focus states show blue border
- [ ] Submit button has gradient and hover effect
- [ ] "Register here" link navigates to signup
- [ ] "Back to Role Selection" button navigates to home
- [ ] Successful login redirects to appropriate dashboard
- [ ] Failed login shows error message

### Signup Page (/signup)
- [ ] Page loads with purple gradient background
- [ ] All form fields display with labels
- [ ] Form validation works
- [ ] Submit button has gradient and hover effect
- [ ] "Login here" link navigates to login
- [ ] "Back to Role Selection" button works
- [ ] Successful signup shows success message and redirects

### Admin Dashboard (/admin-dashboard)
- [ ] Only accessible to Admin role users
- [ ] Navigation bar displays correctly
- [ ] Logout button works and returns to landing page
- [ ] "Provision New Club Account" section displays
- [ ] Form inputs have proper styling
- [ ] Create button has green gradient
- [ ] "Pending Password Resets" section displays
- [ ] Approve/Reject buttons work correctly
- [ ] "Registered Clubs & Organizers" table displays
- [ ] Table has hover effects on rows
- [ ] Remove buttons work correctly
- [ ] All sections have proper shadows and spacing

### Organizer Dashboard (/organizer-dashboard)
- [ ] Only accessible to Organizer role users
- [ ] Navigation bar displays correctly
- [ ] "Request Password Reset" button works
- [ ] Logout button works and returns to landing page
- [ ] Welcome message shows organizer name
- [ ] Club profile card displays correctly
- [ ] Profile information shows in grid layout
- [ ] Event management section displays
- [ ] "Create New Event" button has proper styling
- [ ] Event statistics cards display (0 counts)
- [ ] All cards have hover effects

### Participant Dashboard (/dashboard)
- [ ] Only accessible to Participant role users
- [ ] Navigation bar displays correctly
- [ ] Logout button works and returns to landing page
- [ ] Welcome message shows participant name/email
- [ ] Three feature cards display (Events, Registrations, Profile)
- [ ] Cards have proper icons and styling
- [ ] Cards have hover effects
- [ ] Restricted access notice displays at bottom

## Cross-Browser Testing

### Chrome
- [ ] All gradients render correctly
- [ ] Animations work smoothly
- [ ] Custom scrollbar displays
- [ ] All hover effects work

### Firefox
- [ ] All gradients render correctly
- [ ] Animations work smoothly
- [ ] Hover effects work
- [ ] Font rendering is clear

### Safari
- [ ] All gradients render correctly
- [ ] Animations work smoothly
- [ ] Custom scrollbar displays (WebKit)
- [ ] All functionality works

### Edge
- [ ] All gradients render correctly
- [ ] Animations work smoothly
- [ ] All functionality works

## Responsive Testing

### Desktop (1920x1080)
- [ ] All pages display properly
- [ ] Cards don't stretch too wide
- [ ] Navigation bars look professional
- [ ] Spacing is comfortable

### Laptop (1366x768)
- [ ] All content fits properly
- [ ] Grids adapt well
- [ ] No horizontal scrolling

### Tablet (768x1024)
- [ ] Cards stack appropriately
- [ ] Navigation wraps nicely
- [ ] Touch targets are large enough
- [ ] Forms remain usable

### Mobile (375x667)
- [ ] Single column layouts work
- [ ] All buttons are touchable
- [ ] Text remains readable
- [ ] Forms are usable
- [ ] Navigation collapses properly

## Interaction Testing

### Buttons
- [ ] All buttons show hover effects
- [ ] Hover raises buttons slightly
- [ ] Shadow increases on hover
- [ ] Active state works (press down)
- [ ] Click events fire correctly

### Forms
- [ ] Inputs show focus state (blue border + glow)
- [ ] Placeholder text is readable
- [ ] Form validation works
- [ ] Submit buttons are functional
- [ ] Tab navigation works

### Cards
- [ ] Hover effects work (raise up)
- [ ] Shadow increases on hover
- [ ] Click areas are correct
- [ ] Cursor changes to pointer

### Tables
- [ ] Rows have hover background
- [ ] Header has gradient
- [ ] Text is readable
- [ ] Buttons in cells work

## Accessibility Testing

### Keyboard Navigation
- [ ] Can tab through all interactive elements
- [ ] Focus states are visible
- [ ] Enter key submits forms
- [ ] Escape key closes modals (if any)

### Screen Reader
- [ ] All buttons have clear labels
- [ ] Form inputs have labels
- [ ] Images have alt text (if any)
- [ ] Navigation is logical

### Color Contrast
- [ ] Text on gradients is readable
- [ ] Button text is clear
- [ ] Links are distinguishable
- [ ] Error messages are visible

## Performance Testing

### Load Time
- [ ] Pages load quickly (< 2 seconds)
- [ ] No layout shift on load
- [ ] Fonts load properly
- [ ] Images load (if any)

### Animations
- [ ] Smooth 60fps animations
- [ ] No jank on hover
- [ ] Transitions are fluid
- [ ] No performance issues

### Memory
- [ ] No memory leaks
- [ ] Smooth scrolling
- [ ] No lag when switching pages

## Functionality Testing (Critical)

### Authentication
- [ ] Login works for all roles
- [ ] Logout works from all dashboards
- [ ] Returns to landing page after logout
- [ ] Role-based access control works
- [ ] Can't access wrong dashboard

### Admin Functions
- [ ] Can create organizer accounts
- [ ] Can approve password resets
- [ ] Can reject password resets
- [ ] Can delete organizers
- [ ] All data refreshes correctly

### Organizer Functions
- [ ] Can request password reset
- [ ] Profile information displays
- [ ] Can access event management
- [ ] Create event button navigates correctly

### Participant Functions
- [ ] Can register
- [ ] Can login
- [ ] Dashboard displays correctly
- [ ] All cards are clickable

## Edge Cases

### Empty States
- [ ] No organizers - table shows empty
- [ ] No reset requests - shows message
- [ ] No events - cards show 0

### Error States
- [ ] Failed login shows error
- [ ] Failed signup shows error
- [ ] Network errors handled
- [ ] Invalid data handled

### Long Content
- [ ] Long club names don't break layout
- [ ] Long descriptions wrap properly
- [ ] Long email addresses fit
- [ ] Tables scroll horizontally if needed

## Visual Consistency

### Colors
- [ ] Consistent gradients across pages
- [ ] Button colors match design guide
- [ ] Background gradients are correct
- [ ] Text colors are readable

### Typography
- [ ] Font sizes are consistent
- [ ] Font weights are proper
- [ ] Line heights are comfortable
- [ ] Letter spacing is correct

### Spacing
- [ ] Padding is consistent
- [ ] Margins are uniform
- [ ] Gaps in grids are proper
- [ ] White space is comfortable

### Borders & Shadows
- [ ] Border radius is consistent
- [ ] Shadows are uniform
- [ ] Border colors match
- [ ] Hover shadows work

## Final Checks

- [ ] No console errors
- [ ] No console warnings
- [ ] All images load (if any)
- [ ] All icons display (emojis)
- [ ] No broken links
- [ ] No typos in text
- [ ] Professional appearance
- [ ] Matches design guide

## Sign-off

- [ ] All critical functionality works
- [ ] UI matches design specifications
- [ ] No breaking bugs found
- [ ] Performance is acceptable
- [ ] Ready for production

---

**Tester Name:** ___________________
**Date:** ___________________
**Browser/Device:** ___________________
**Issues Found:** ___________________

