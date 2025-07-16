import { useMutation } from "@tanstack/react-query";
import { CustomBlockDefinition } from "@zyra/types";
import api from "@/lib/services/api";
import { toast } from "./use-toast";

const manualCustomBlock = (customBlock: CustomBlockDefinition) =>
  api.post("/blocks/custom", customBlock);
const aiCustomBlock = (customBlock: CustomBlockDefinition) =>
  api.post("/ai/generate-block", { prompt: customBlock.description });

export const useCreateCustomBlock = () => {
  return useMutation({
    mutationFn: ({
      customBlock,
      method,
    }: {
      customBlock: CustomBlockDefinition;
      method: "manual" | "ai";
    }) => {
      if (method === "manual") {
        return manualCustomBlock(customBlock);
      } else {
        return aiCustomBlock(customBlock);
      }
    },
    onSuccess: () => {
      toast({
        title: "Custom block created",
        description: "Your custom block has been created",
      });
    },
  });
};
