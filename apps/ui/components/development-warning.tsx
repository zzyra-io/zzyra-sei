import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";

const DevelopmentWarning = () => {
  const [open, setOpen] = useState(true);
  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Development Warning</DialogTitle>
        </DialogHeader>
        <DialogDescription>
          <Alert variant='destructive'>
            <AlertTitle>Zyra is in still DEVELOPMENT stage</AlertTitle>
            <AlertDescription>
              NONE of these are real results.
              <br />
              DONOT USE THIS FOR REAL WORKFLOWS.
            </AlertDescription>
          </Alert>
        </DialogDescription>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DevelopmentWarning;
