# **App Name**: Portaria Única RES

## Core Features:

- Login & Authorization: Login screen with admin user (admin/michelin) and role-based access to menus.
- Entry Registration: Entry registration form with fields for driver, assistants (optional), transport company, license plates, internal destination, movement type, and observation notes.
- Entry Status: Option to mark entry as 'Waiting in Yard' and move it to a separate screen, or mark as 'Entry Approved'.
- Printable Entry Document: Generate barcode (YYYYMMDDHHMMSS) for entry and include all data on printable document.
- Exit Registration: Exit registration by entering the 14-digit code; system automatically validates code and confirms with a message.
- User Management (Admin Only): Admin can manage users (name, login, password). Other general information that are needed will also be set.
- History of Accesses: Data tables containing all registered information with the options to filter by transport company, plates. Export information into excel spreadsheets by selecting the time period.

## Style Guidelines:

- Primary color: Dark grayish blue (#4A6572) for a professional and industrial feel.
- Background color: Light grayish blue (#E8F0FE) for a clean, calm interface.
- Accent color: A muted orange (#D38F3F) to provide highlights and contrasts in the color scheme.
- Font: 'Inter' sans-serif font for a modern, professional and readable interface. Use 'Inter' for both headlines and body text.
- Simple, clear icons to represent menu items and actions. Use a consistent style throughout the application.
- Left sidebar navigation for main menu items. Forms should be clean and well-organized. Use modals for confirmation messages.
- Subtle transitions and animations to provide feedback on actions (e.g., form submission, data loading).