/**
 * MUI Components Barrel File
 *
 * よく使うMUIコンポーネントを再エクスポート
 * import { Box, Typography, Button } from '@/lib/mui';
 */

// ============================================
// Layout
// ============================================
export { Box, Container, Grid, Paper, Divider } from '@mui/material';

// ============================================
// Typography
// ============================================
export { Typography, Link as MUILink } from '@mui/material';

// ============================================
// Inputs
// ============================================
export {
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  InputAdornment,
  Checkbox,
  FormControlLabel,
} from '@mui/material';

// ============================================
// Feedback
// ============================================
export { CircularProgress, Alert, Snackbar } from '@mui/material';

// ============================================
// Navigation
// ============================================
export { AppBar, Toolbar, Tabs, Tab } from '@mui/material';

// ============================================
// Data Display
// ============================================
export {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Tooltip,
} from '@mui/material';

// ============================================
// Dialog
// ============================================
export { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

// ============================================
// Accordion
// ============================================
export { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';

// ============================================
// Toggle
// ============================================
export { ToggleButton, ToggleButtonGroup } from '@mui/material';

// ============================================
// Drawer
// ============================================
export { Drawer, IconButton, Card, CardContent } from '@mui/material';

// ============================================
// Icons (most common)
// ============================================
export { default as TableRowsIcon } from '@mui/icons-material/TableRows';
export { default as ViewKanbanIcon } from '@mui/icons-material/ViewKanban';
export { default as DeleteIcon } from '@mui/icons-material/Delete';
export { default as EditIcon } from '@mui/icons-material/Edit';
export { default as AddIcon } from '@mui/icons-material/Add';
export { default as CloseIcon } from '@mui/icons-material/Close';
export { default as ExpandMoreIcon } from '@mui/icons-material/ExpandMore';
export { default as SearchIcon } from '@mui/icons-material/Search';
export { default as FolderOpenIcon } from '@mui/icons-material/FolderOpen';
export { default as LocalFireDepartmentIcon } from '@mui/icons-material/LocalFireDepartment';
export { default as ChatBubbleOutlineIcon } from '@mui/icons-material/ChatBubbleOutline';
export { default as PlayArrowIcon } from '@mui/icons-material/PlayArrow';
export { default as StopIcon } from '@mui/icons-material/Stop';
