# Visual Design Guide - Felicity Event Management

## Color Palette

### Primary Colors
```
Purple Gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
- Used for: Main backgrounds, primary buttons, headers
```

### Secondary Colors
```
Green Gradient: linear-gradient(135deg, #11998e 0%, #38ef7d 100%)
- Used for: Success actions, create buttons

Pink/Red Gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)
- Used for: Logout buttons, warning actions

Red Gradient: linear-gradient(135deg, #eb3349 0%, #f45c43 100%)
- Used for: Delete buttons, reject actions

Aqua/Pink: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)
- Used for: Admin dashboard background

Orange/Peach: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)
- Used for: Organizer dashboard background

Purple/Blue: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)
- Used for: Participant dashboard background
```

## Typography

### Font Family
```css
-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```

### Font Sizes
- Page Title: 3rem (48px)
- Section Title: 2.5rem (40px)
- Heading: 2rem (32px)
- Subheading: 1.5rem (24px)
- Body: 1rem (16px)
- Small: 0.95rem (15.2px)
- Tiny: 0.85rem (13.6px)

### Font Weights
- Light: 300
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

## Spacing System

### Padding
- Small: 8px-12px
- Medium: 15px-20px
- Large: 30px-40px
- XL: 50px

### Margins
- Small: 10px-15px
- Medium: 20px-30px
- Large: 40px-50px

### Gaps (Grid/Flex)
- Small: 10px
- Medium: 20px
- Large: 30px

## Border Radius

```
Small: 6-8px (buttons, inputs)
Medium: 10-12px (cards)
Large: 15px (sections)
XL: 20px (main containers)
```

## Shadows

### Card Shadows
```css
Box Shadow: 0 10px 30px rgba(0,0,0,0.1)
Hover Shadow: 0 15px 40px rgba(0,0,0,0.2)
```

### Button Shadows
```css
Primary: 0 4px 15px rgba(102, 126, 234, 0.4)
Success: 0 4px 15px rgba(56, 239, 125, 0.4)
Danger: 0 4px 15px rgba(235, 51, 73, 0.4)
```

## Components

### Buttons

#### Primary Button
```css
padding: 14px 24px
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
color: white
border: none
border-radius: 8px
font-weight: 600
box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4)

Hover: transform: translateY(-2px)
```

#### Secondary Button
```css
padding: 12px 20px
background: transparent
border: 2px solid #667eea
color: #667eea
border-radius: 8px
font-weight: 600

Hover: background: rgba(102, 126, 234, 0.1)
```

### Input Fields

```css
padding: 12px 16px
font-size: 1rem
border: 2px solid #e0e0e0
border-radius: 8px

Focus: border-color: #667eea
       box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1)
```

### Cards

#### Standard Card
```css
background: white
border-radius: 15px
padding: 30px
box-shadow: 0 10px 30px rgba(0,0,0,0.1)

Hover: transform: translateY(-5px)
       box-shadow: 0 15px 40px rgba(0,0,0,0.2)
```

#### Role Selection Card
```css
background: white
border-radius: 15px
padding: 40px 30px
text-align: center
cursor: pointer
box-shadow: 0 10px 30px rgba(0,0,0,0.2)

Hover: transform: translateY(-10px)
```

### Navigation Bar

```css
display: flex
justify-content: space-between
align-items: center
padding: 20px 40px
background: white
box-shadow: 0 2px 10px rgba(0,0,0,0.1)
```

### Tables

```css
Header:
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
  color: white
  padding: 15px
  font-weight: 600

Rows:
  border-bottom: 1px solid #e0e0e0
  padding: 15px

Hover:
  background: #f8f9fa
```

## Emoji Icons Used

```
🎉 - Celebration/Welcome
👨‍💼 - Admin
🎭 - Organizer
🎓 - Participant
📧 - Email
🔒 - Password/Security
👤 - Profile/User
📅 - Events/Calendar
🎫 - Tickets/Registration
🏢 - Organization/Club
🔑 - Password Reset
➕ - Add/Create
✅ - Success/Approve
✗ - Reject
🗑️ - Delete/Remove
📊 - Statistics
👥 - Users/Audience
📱 - Contact/Phone
```

## Animation Timings

```css
Fast: 0.2s (button hover, small transforms)
Medium: 0.3s (card hover, border changes)
Slow: 0.5s (page transitions, large movements)
```

## Responsive Breakpoints

```css
Mobile: < 768px
Tablet: 768px - 1024px
Desktop: > 1024px

Grid Auto-fit: minmax(250px, 1fr)
```

## Page-Specific Designs

### Landing Page
- Full-height centered layout
- 3-column card grid (auto-fit)
- Large emoji icons (4rem)
- Purple gradient background

### Login/Signup Pages
- Centered card (max-width: 450px/500px)
- Form with labeled inputs
- Purple gradient background
- "Back to Role Selection" button

### Admin Dashboard
- White navigation bar
- Aqua/pink gradient background
- Multi-section layout with cards
- Color-coded sections
- Professional table design

### Organizer Dashboard
- White navigation bar
- Orange/peach gradient background
- Welcome banner
- Profile card with grid layout
- Event statistics cards

### Participant Dashboard
- White navigation bar
- Purple/blue gradient background
- Welcome banner
- 3-card feature grid
- Clean, simple layout

## Interaction States

### Hover
```css
Buttons: translateY(-2px) + increased shadow
Cards: translateY(-5px) + increased shadow
Links: color change + underline
```

### Focus
```css
Inputs: border color change + glow shadow
Buttons: outline with offset
Links: outline
```

### Active
```css
Buttons: translateY(0) - returns to normal position
Links: darker color
```

## Best Practices Applied

1. **Consistent Spacing**: Used multiples of 4-8px
2. **Color Harmony**: Gradients with complementary colors
3. **Visual Hierarchy**: Clear size and weight differences
4. **Accessibility**: Sufficient contrast ratios
5. **Smooth Interactions**: All transitions use ease timing
6. **Mobile-First**: Responsive grids and flexible layouts
7. **Performance**: System fonts, CSS transforms
8. **User Feedback**: Hover states, focus states, transitions

---

*This design guide ensures consistency across all pages and components.*
