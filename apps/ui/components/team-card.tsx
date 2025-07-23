"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Settings, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

interface TeamCardProps {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  role: string;
  createdAt: string;
}

export function TeamCard({
  id,
  name,
  description,
  memberCount,
  role,
  createdAt,
}: TeamCardProps) {
  const isOwner = role === "owner";
  const formattedDate = new Date(createdAt).toLocaleDateString();

  async function handleDelete() {
    if (
      confirm(
        "Are you sure you want to delete this team? This action cannot be undone."
      )
    ) {
      // await deleteTeam(id)
    }
  }

  return (
    <motion.div
      className="group"
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <Card className='relative overflow-hidden bg-background/50 backdrop-blur-sm border hover:shadow-lg transition-all'>
        {/* Gradient overlay on hover */}
        <motion.div
          className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
        
        <CardHeader className='bg-gradient-to-r from-muted/50 to-muted/30'>
          <CardTitle className='flex items-center gap-2'>
            <div className="p-2 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20">
              <Users className='h-5 w-5 text-primary' />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground group-hover:from-primary group-hover:to-purple-600 transition-all duration-300">
              {name}
            </span>
          </CardTitle>
          <CardDescription>
            {description || "No description provided"}
          </CardDescription>
        </CardHeader>
      <CardContent className='p-6'>
        <div className='flex items-center justify-between text-sm text-muted-foreground'>
          <div>
            <span className='font-medium'>{memberCount}</span>{" "}
            {memberCount === 1 ? "member" : "members"}
          </div>
          <div>Created on {formattedDate}</div>
        </div>
      </CardContent>
      <CardFooter className='flex justify-between bg-gradient-to-r from-muted/20 to-muted/10 p-4'>
        <div className='text-xs font-medium'>
          Your role: <span className='capitalize text-primary'>{role}</span>
        </div>
        <div className='flex gap-2'>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant='outline' size='sm' asChild className="hover:bg-gradient-to-r hover:from-primary/10 hover:to-purple-500/10">
              <Link href={`/teams/${id}`}>View</Link>
            </Button>
          </motion.div>
          {isOwner && (
            <>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant='outline' size='sm' asChild className="hover:bg-gradient-to-r hover:from-primary/10 hover:to-purple-500/10">
                  <Link href={`/teams/${id}/settings`}>
                    <Settings className='mr-1 h-4 w-4' />
                    Settings
                  </Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant='destructive' size='sm' onClick={handleDelete} className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">
                  <Trash2 className='h-4 w-4' />
                  <span className='sr-only'>Delete</span>
                </Button>
              </motion.div>
            </>
          )}
        </div>
      </CardFooter>
      </Card>
    </motion.div>
  );
}
