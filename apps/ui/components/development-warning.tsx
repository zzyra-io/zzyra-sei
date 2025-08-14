import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const DevelopmentWarning = () => {
  const [open, setOpen] = useState(false);

  // // Only show in development environment
  // if (process.env.NODE_ENV === "production") {
  //   return null;
  // }

  // Show warning in development
  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Development Environment</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <Alert variant='default'>
            <AlertTitle>Zzyra Development Build</AlertTitle>
            <AlertDescription>
              This is a development version of Zzyra. Some features may be
              experimental or incomplete.
              <br />
              For production use, please use the official release.
            </AlertDescription>
          </Alert>
        </DialogDescription>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DevelopmentWarning;
