import { Menu, Search } from '@mui/icons-material';
import { AppBar, Box, Drawer, IconButton, Paper, TextField, Toolbar, Typography } from '@mui/material';
import { useState } from 'react';
import { Link } from 'react-router';

export const Header = () => {
    const [open, setOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    const toggleDrawer = (newOpen: boolean) => () => {
        setOpen(newOpen);
    };
    return (
        <>
            <Drawer open={open} onClose={toggleDrawer(false)} sx={{ minWidth: '30vw' }}>
                <Box component={Link} to="/" sx={{ p: 2, textDecoration: 'none', color: '#234234', minWidth: '20vw' }}>Home</Box>
                <Box component={Link} to="/about" sx={{ p: 2, textDecoration: 'none', color: '#234234', minWidth: '20vw' }}>About</Box>
            </Drawer><AppBar position="relative">
                <Toolbar>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        sx={{ mr: 2 }}
                        onClick={toggleDrawer(true)}
                    >
                        <Menu />
                    </IconButton>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
                            TimeLog
                        </Link>
                    </Typography>
                    <IconButton
                        size="large"
                        edge="start"
                        color="inherit"
                        aria-label="Toggle search"
                        onClick={() => setSearchOpen(!searchOpen)}
                        aria-controls="search-menu"
                        aria-expanded={searchOpen}
                    >
                        <Search />
                    </IconButton>
                    <Paper id="search-menu" hidden={!searchOpen} sx={{ position: 'absolute', right: '40px', top: '100%', p: 2 }}>
                        <TextField label="Search" />
                    </Paper>
                </Toolbar>
            </AppBar>
        </>
    )
};