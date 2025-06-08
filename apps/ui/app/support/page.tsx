"use client";

import type React from "react";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  HelpCircle,
  MessageSquare,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
} from "lucide-react";

// Mock support tickets
const mockTickets = [
  {
    id: "TICKET-1001",
    subject: "Cannot connect my wallet",
    status: "open",
    priority: "high",
    created_at: "2023-05-15T10:30:00Z",
    updated_at: "2023-05-15T14:45:00Z",
    messages: [
      {
        id: "MSG-1",
        sender: "user",
        content:
          "I'm having trouble connecting my MetaMask wallet. It keeps showing an error.",
        created_at: "2023-05-15T10:30:00Z",
      },
      {
        id: "MSG-2",
        sender: "support",
        content:
          "I'm sorry to hear that. Could you please provide more details about the error message you're seeing?",
        created_at: "2023-05-15T14:45:00Z",
      },
    ],
  },
  {
    id: "TICKET-1002",
    subject: "Workflow execution failed",
    status: "in_progress",
    priority: "medium",
    created_at: "2023-05-14T08:20:00Z",
    updated_at: "2023-05-14T16:10:00Z",
    messages: [
      {
        id: "MSG-3",
        sender: "user",
        content:
          "My workflow execution failed with an error about insufficient gas.",
        created_at: "2023-05-14T08:20:00Z",
      },
      {
        id: "MSG-4",
        sender: "support",
        content:
          "Thank you for reporting this. It sounds like you need to increase the gas limit for your transaction. Let me guide you through the process.",
        created_at: "2023-05-14T16:10:00Z",
      },
    ],
  },
  {
    id: "TICKET-1003",
    subject: "Billing question",
    status: "resolved",
    priority: "low",
    created_at: "2023-05-10T11:15:00Z",
    updated_at: "2023-05-11T09:30:00Z",
    messages: [
      {
        id: "MSG-5",
        sender: "user",
        content:
          "I have a question about my recent invoice. There seems to be a discrepancy in the charges.",
        created_at: "2023-05-10T11:15:00Z",
      },
      {
        id: "MSG-6",
        sender: "support",
        content:
          "I'd be happy to look into this for you. Could you please provide your account email and the invoice number?",
        created_at: "2023-05-10T15:20:00Z",
      },
      {
        id: "MSG-7",
        sender: "user",
        content:
          "My email is user@example.com and the invoice number is INV-2023-05-01.",
        created_at: "2023-05-10T16:45:00Z",
      },
      {
        id: "MSG-8",
        sender: "support",
        content:
          "Thank you for providing that information. I've checked your account and found that there was indeed an error in the billing. We've issued a refund for the difference, which should appear in your account within 3-5 business days. Please let me know if you have any other questions.",
        created_at: "2023-05-11T09:30:00Z",
      },
    ],
  },
];

export default function SupportPage() {
  const [tickets, setTickets] = useState(mockTickets);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketMessage, setNewTicketMessage] = useState("");
  const [newTicketPriority, setNewTicketPriority] = useState("medium");
  const { toast } = useToast();

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const updatedTickets = tickets.map((ticket) => {
      if (ticket.id === activeTicket.id) {
        return {
          ...ticket,
          messages: [
            ...ticket.messages,
            {
              id: `MSG-${Date.now()}`,
              sender: "user",
              content: newMessage,
              created_at: new Date().toISOString(),
            },
          ],
          updated_at: new Date().toISOString(),
        };
      }
      return ticket;
    });

    setTickets(updatedTickets);
    setActiveTicket(
      updatedTickets.find((ticket) => ticket.id === activeTicket.id)
    );
    setNewMessage("");

    toast({
      title: "Message sent",
      description: "Your message has been sent to support.",
    });
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTicketSubject.trim() || !newTicketMessage.trim()) return;

    const newTicket = {
      id: `TICKET-${1000 + tickets.length + 1}`,
      subject: newTicketSubject,
      status: "open",
      priority: newTicketPriority,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [
        {
          id: `MSG-${Date.now()}`,
          sender: "user",
          content: newTicketMessage,
          created_at: new Date().toISOString(),
        },
      ],
    };

    setTickets([newTicket, ...tickets]);
    setNewTicketSubject("");
    setNewTicketMessage("");
    setNewTicketPriority("medium");

    toast({
      title: "Ticket created",
      description: "Your support ticket has been created successfully.",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className='h-4 w-4 text-yellow-500' />;
      case "in_progress":
        return <Clock className='h-4 w-4 text-blue-500' />;
      case "resolved":
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      default:
        return <HelpCircle className='h-4 w-4' />;
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      <div className='flex min-h-screen flex-col'>
        <DashboardHeader />
        <main className='flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8'>
          <div className='mx-auto max-w-7xl'>
            <div className='mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
              <h1 className='text-2xl font-bold tracking-tight'>Support</h1>
            </div>

            <Tabs defaultValue='tickets' className='space-y-4'>
              <TabsList>
                <TabsTrigger value='tickets'>My Tickets</TabsTrigger>
                <TabsTrigger value='new'>New Ticket</TabsTrigger>
                <TabsTrigger value='knowledge'>Knowledge Base</TabsTrigger>
              </TabsList>

              <TabsContent value='tickets' className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                  <div className='md:col-span-1 space-y-4'>
                    <div className='relative'>
                      <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
                      <Input
                        type='search'
                        placeholder='Search tickets...'
                        className='pl-8'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className='space-y-2'>
                      {filteredTickets.length > 0 ? (
                        filteredTickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className={`rounded-md border p-3 cursor-pointer transition-colors hover:bg-accent ${
                              activeTicket?.id === ticket.id
                                ? "border-primary bg-accent"
                                : ""
                            }`}
                            onClick={() => setActiveTicket(ticket)}>
                            <div className='flex items-center justify-between'>
                              <span className='text-xs font-medium text-muted-foreground'>
                                {ticket.id}
                              </span>
                              <div className='flex items-center'>
                                {getStatusIcon(ticket.status)}
                                <span
                                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityClass(
                                    ticket.priority
                                  )}`}>
                                  {ticket.priority}
                                </span>
                              </div>
                            </div>
                            <h3 className='mt-1 font-medium line-clamp-1'>
                              {ticket.subject}
                            </h3>
                            <p className='mt-1 text-xs text-muted-foreground'>
                              Updated{" "}
                              {new Date(ticket.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className='rounded-md border p-4 text-center'>
                          <p className='text-muted-foreground'>
                            No tickets found
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='md:col-span-2'>
                    {activeTicket ? (
                      <Card>
                        <CardHeader>
                          <div className='flex items-center justify-between'>
                            <div>
                              <CardTitle>{activeTicket.subject}</CardTitle>
                              <CardDescription>
                                {activeTicket.id} · Created on{" "}
                                {new Date(
                                  activeTicket.created_at
                                ).toLocaleDateString()}
                              </CardDescription>
                            </div>
                            <div className='flex items-center'>
                              {getStatusIcon(activeTicket.status)}
                              <span className='ml-2 text-sm'>
                                {activeTicket.status.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className='space-y-4'>
                            {activeTicket.messages.map((message: any) => (
                              <div
                                key={message.id}
                                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                  className={`rounded-lg p-3 max-w-[80%] ${
                                    message.sender === "user"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted"
                                  }`}>
                                  <p className='text-sm'>{message.content}</p>
                                  <p className='mt-1 text-xs opacity-70'>
                                    {new Date(
                                      message.created_at
                                    ).toLocaleTimeString()}{" "}
                                    ·{" "}
                                    {new Date(
                                      message.created_at
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                        <CardFooter>
                          <div className='flex w-full items-center space-x-2'>
                            <Textarea
                              placeholder='Type your message here...'
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              className='flex-1'
                            />
                            <Button
                              onClick={handleSendMessage}
                              disabled={!newMessage.trim()}>
                              Send
                            </Button>
                          </div>
                        </CardFooter>
                      </Card>
                    ) : (
                      <div className='flex h-full items-center justify-center rounded-md border p-8'>
                        <div className='text-center'>
                          <MessageSquare className='mx-auto h-12 w-12 text-muted-foreground' />
                          <h3 className='mt-4 text-lg font-medium'>
                            No ticket selected
                          </h3>
                          <p className='mt-2 text-sm text-muted-foreground'>
                            Select a ticket from the list to view its details
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='new' className='space-y-4'>
                <Card>
                  <form onSubmit={handleCreateTicket}>
                    <CardHeader>
                      <CardTitle>Create a New Support Ticket</CardTitle>
                      <CardDescription>
                        Describe your issue in detail and our support team will
                        get back to you as soon as possible.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div className='space-y-2'>
                        <Label htmlFor='subject'>Subject</Label>
                        <Input
                          id='subject'
                          placeholder='Brief description of your issue'
                          value={newTicketSubject}
                          onChange={(e) => setNewTicketSubject(e.target.value)}
                          required
                        />
                      </div>
                      <div className='space-y-2'>
                        <Label htmlFor='priority'>Priority</Label>
                        <Select
                          value={newTicketPriority}
                          onValueChange={setNewTicketPriority}>
                          <SelectTrigger id='priority'>
                            <SelectValue placeholder='Select priority' />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='low'>Low</SelectItem>
                            <SelectItem value='medium'>Medium</SelectItem>
                            <SelectItem value='high'>High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='space-y-2'>
                        <Label htmlFor='message'>Message</Label>
                        <Textarea
                          id='message'
                          placeholder='Describe your issue in detail...'
                          value={newTicketMessage}
                          onChange={(e) => setNewTicketMessage(e.target.value)}
                          className='min-h-[150px]'
                          required
                        />
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        type='submit'
                        disabled={
                          !newTicketSubject.trim() || !newTicketMessage.trim()
                        }>
                        Submit Ticket
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>

              <TabsContent value='knowledge' className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                  <div className='md:col-span-1'>
                    <Card>
                      <CardHeader>
                        <CardTitle>Categories</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className='space-y-2'>
                          <Button
                            variant='ghost'
                            className='w-full justify-start'>
                            <FileText className='mr-2 h-4 w-4' />
                            Getting Started
                          </Button>
                          <Button
                            variant='ghost'
                            className='w-full justify-start'>
                            <FileText className='mr-2 h-4 w-4' />
                            Account & Billing
                          </Button>
                          <Button
                            variant='ghost'
                            className='w-full justify-start'>
                            <FileText className='mr-2 h-4 w-4' />
                            Workflows
                          </Button>
                          <Button
                            variant='ghost'
                            className='w-full justify-start'>
                            <FileText className='mr-2 h-4 w-4' />
                            Blockchain Integration
                          </Button>
                          <Button
                            variant='ghost'
                            className='w-full justify-start'>
                            <FileText className='mr-2 h-4 w-4' />
                            Troubleshooting
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className='md:col-span-2'>
                    <Card>
                      <CardHeader>
                        <CardTitle>Popular Articles</CardTitle>
                        <CardDescription>
                          Frequently asked questions and helpful guides
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className='space-y-4'>
                          <div className='rounded-md border p-4 hover:bg-accent transition-colors cursor-pointer'>
                            <h3 className='font-medium'>
                              How to connect your wallet
                            </h3>
                            <p className='mt-1 text-sm text-muted-foreground'>
                              Learn how to connect MetaMask, WalletConnect, and
                              other wallets to your account.
                            </p>
                          </div>
                          <div className='rounded-md border p-4 hover:bg-accent transition-colors cursor-pointer'>
                            <h3 className='font-medium'>
                              Creating your first workflow
                            </h3>
                            <p className='mt-1 text-sm text-muted-foreground'>
                              A step-by-step guide to creating and deploying
                              your first automation workflow.
                            </p>
                          </div>
                          <div className='rounded-md border p-4 hover:bg-accent transition-colors cursor-pointer'>
                            <h3 className='font-medium'>
                              Understanding subscription plans
                            </h3>
                            <p className='mt-1 text-sm text-muted-foreground'>
                              Compare our subscription plans and choose the
                              right one for your needs.
                            </p>
                          </div>
                          <div className='rounded-md border p-4 hover:bg-accent transition-colors cursor-pointer'>
                            <h3 className='font-medium'>
                              Troubleshooting failed executions
                            </h3>
                            <p className='mt-1 text-sm text-muted-foreground'>
                              Common reasons for workflow execution failures and
                              how to fix them.
                            </p>
                          </div>
                          <div className='rounded-md border p-4 hover:bg-accent transition-colors cursor-pointer'>
                            <h3 className='font-medium'>
                              Team collaboration features
                            </h3>
                            <p className='mt-1 text-sm text-muted-foreground'>
                              Learn how to invite team members and collaborate
                              on workflows.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </>
  );
}
