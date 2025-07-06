import { Container, Button, Typography, Box } from "@mui/material";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <Container sx={{ textAlign: "center", mt: 12 }}>
      <Typography variant="h3" gutterBottom>Welcome to CodeMeet</Typography>
      <Typography variant="subtitle1">Choose a login method</Typography>

      <Box mt={4}>
        <Link to="/login" style={{ textDecoration: 'none' }}>
          <Button variant="outlined" sx={{ m: 1 }}>Login</Button>
        </Link>

        <Link to="/register" style={{ textDecoration: 'none' }}>
          <Button variant="outlined" sx={{ m: 1 }}>Register</Button>
        </Link>

        <a href="http://localhost:4000/api/auth/google">
          <Button variant="outlined"  sx={{ m:1 }}>
            Login with Google
          </Button>
        </a>
      </Box>
    </Container>
  );
}
