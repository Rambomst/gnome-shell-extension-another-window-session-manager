# gnome-shell-extension-another-window-session-manager
Close and save open windows. And restore saved windows sessions.

Most importantly, it supports both X.org and Wayland!

This project is in early development, I'm planing to add some other features, but it basically works now.

<p align="left">
  <a href="https://extensions.gnome.org/extension/4709/another-window-session-manager/">
    <img alt="Get it on GNOME Extensions" width="228" src="https://raw.githubusercontent.com/andyholmes/gnome-shell-extensions-badge/master/get-it-on-ego.svg?sanitize=true"/>
  </a>
</p>

# Screenshot

## Overview
![image](https://user-images.githubusercontent.com/2271720/147489333-04a7e657-5a72-45b1-91c3-9dd5dc2f347c.png)


## Close open windows
Click button or item to close open windows:

![image](https://user-images.githubusercontent.com/2271720/147405215-6854d881-1a9b-4352-9c42-9a2b8b22e8a3.png)


After confirm to close:

![image](https://user-images.githubusercontent.com/2271720/147340835-853e1672-9b99-4411-a62b-df22a8450b3d.png)

## Save open windows
Click button or item to save open windows as a session:

![image](https://user-images.githubusercontent.com/2271720/147405226-f580018c-e098-47e7-82f3-cdd1a86bd080.png)

After confirm to save:

![image](https://user-images.githubusercontent.com/2271720/147405241-cd6fd8ac-bc86-4d8e-87fb-6ce6abfa7eef.png)


# Features
1. Save open windows
2. Restore saved open windows and move open windows automatically in the progress
3. Move windows using a saved session
4. ...

# Panel menu items

## Icons description

| Icon                                                         | Description                                                  |
|--------------------------------------------------------------|--------------------------------------------------------------|
| <img src=icons/save-symbolic.svg width="14" height="14">     | Save open windows as a session, which name is the item's name |
| <img src=icons/restore-symbolic.svg width="14" height="14">  | Restore the saved session using the item's name               |
| <img src=icons/move-symbolic.svg width="14" height="14">     | Move the open windows using the item's name                  |
| <img src=icons/close-symbolic.svg width="14" height="14">    | Close the current open windows                               |

# Dependencies
This project uses `ps` to get some information from a process, install it via `dnf install procps-ng` if don't have.

# limitation
- It depends on St(Shell Toolkit) and Shell APIs so heavily
- ...

# TODO
1. - Save open windows
     - [x] Save open windows 
3. - Restore saved open windows
      - [x] Restore saved open windows
      - [x] Move to belonging workspace automatically
      - [ ] Restore window's geometry
4. - Saved open windows list
      - [x] Saved open windows list
      - [x] Restore button
      - [x] Rename button
      - [x] Delete button
5. - [x] Move windows using a saved session.
6. - [ ] Settings
      - [x] Debugging mode
8. - [ ] All TODO tags in the projects
