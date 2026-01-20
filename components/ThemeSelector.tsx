'use client';

import { useState } from 'react';
import {
  Box,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckIcon from '@mui/icons-material/Check';
import { useThemeStore, THEME_OPTIONS, ThemeId } from '@/stores/themeStore';

export function ThemeSelector() {
  const { currentTheme, setCurrentTheme } = useThemeStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectTheme = (themeId: ThemeId) => {
    setCurrentTheme(themeId);
    handleClose();
  };

  return (
    <Box>
      <Tooltip title="テーマを変更">
        <IconButton
          id="theme-button"
          onClick={handleClick}
          size="small"
          sx={{ color: 'text.secondary' }}
          aria-controls={open ? 'theme-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <PaletteIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'theme-button',
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {Object.values(THEME_OPTIONS).map((theme) => (
          <MenuItem
            key={theme.id}
            onClick={() => handleSelectTheme(theme.id as ThemeId)}
            selected={currentTheme === theme.id}
          >
            <ListItemIcon>
              {currentTheme === theme.id && <CheckIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText primary={theme.name} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
