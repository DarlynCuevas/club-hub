import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

interface CreateCoachModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateCoachModal({ open, onClose, onCreated }: CreateCoachModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!fullName || !email) {
      toast({ title: "Faltan campos", description: "Nombre y email son obligatorios", variant: "destructive" });
      return;
    }
      setLoading(true);
      const {
          data: { session }
      } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke("clever-task", {
          body: { full_name: fullName, email },
      });
    setLoading(false);
    if (error || data?.error) {
      toast({ title: "Error", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Coach creado", description: `Se ha creado el coach ${fullName}` });
    setFullName("");
    setEmail("");
    onClose();
    onCreated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Crear coach</DialogTitle>
        <div className="space-y-4 mt-2">
          <Input
            placeholder="Nombre completo"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            disabled={loading}
          />
          <Input
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button onClick={onClose} variant="secondary" disabled={loading}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Creando..." : "Crear coach"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
