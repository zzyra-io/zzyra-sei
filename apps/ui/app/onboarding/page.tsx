"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Check, ChevronRight } from "lucide-react"

export default function OnboardingPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // User profile data
  const [fullName, setFullName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [role, setRole] = useState("")
  const [experience, setExperience] = useState("beginner")

  // Use case data
  const [useCase, setUseCase] = useState("")
  const [goals, setGoals] = useState("")

  // Preferences
  const [notifications, setNotifications] = useState(true)
  const [theme, setTheme] = useState("system")

  const handleNext = () => {
    setStep(step + 1)
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      // Save all onboarding data to the user's profile
      // todo:implement prisma
      const { error } = {
        error: null,
      }

      if (error) throw error

      toast({
        title: "Onboarding complete!",
        description: "Your profile has been set up successfully.",
      })

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (error) {
      console.error("Error saving onboarding data:", error)
      toast({
        title: "Error saving profile",
        description: "There was a problem saving your information. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-8">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold">Welcome to Zyra</h1>
            <p className="mt-2 text-muted-foreground">Let's set up your account in a few simple steps</p>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 1 ? "bg-primary text-primary-foreground" : "border border-muted-foreground bg-background"}`}
                >
                  {step > 1 ? <Check className="h-4 w-4" /> : 1}
                </div>
                <div className="ml-2 text-sm font-medium">Profile</div>
              </div>
              <div className="h-0.5 w-10 bg-muted-foreground/30"></div>
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 2 ? "bg-primary text-primary-foreground" : "border border-muted-foreground bg-background"}`}
                >
                  {step > 2 ? <Check className="h-4 w-4" /> : 2}
                </div>
                <div className="ml-2 text-sm font-medium">Use Case</div>
              </div>
              <div className="h-0.5 w-10 bg-muted-foreground/30"></div>
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${step >= 3 ? "bg-primary text-primary-foreground" : "border border-muted-foreground bg-background"}`}
                >
                  {step > 3 ? <Check className="h-4 w-4" /> : 3}
                </div>
                <div className="ml-2 text-sm font-medium">Preferences</div>
              </div>
            </div>
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>Tell us a bit about yourself</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company/Organization (Optional)</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Acme Inc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Your Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="developer">Developer</SelectItem>
                      <SelectItem value="trader">Trader</SelectItem>
                      <SelectItem value="investor">Investor</SelectItem>
                      <SelectItem value="project_manager">Project Manager</SelectItem>
                      <SelectItem value="business_owner">Business Owner</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Web3 Experience Level</Label>
                  <RadioGroup value={experience} onValueChange={setExperience}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="beginner" id="beginner" />
                      <Label htmlFor="beginner">Beginner</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="intermediate" id="intermediate" />
                      <Label htmlFor="intermediate">Intermediate</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="advanced" id="advanced" />
                      <Label htmlFor="advanced">Advanced</Label>
                    </div>
                  </RadioGroup>
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                  Skip
                </Button>
                <Button onClick={handleNext} disabled={!fullName || !role}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Use Case</CardTitle>
                <CardDescription>Help us understand how you plan to use Zyra</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="useCase">Primary Use Case</Label>
                  <Select value={useCase} onValueChange={setUseCase}>
                    <SelectTrigger id="useCase">
                      <SelectValue placeholder="Select your primary use case" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="defi_automation">DeFi Automation</SelectItem>
                      <SelectItem value="wallet_monitoring">Wallet Monitoring</SelectItem>
                      <SelectItem value="nft_trading">NFT Trading</SelectItem>
                      <SelectItem value="dao_operations">DAO Operations</SelectItem>
                      <SelectItem value="portfolio_management">Portfolio Management</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goals">Your Goals</Label>
                  <Textarea
                    id="goals"
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    placeholder="What are you hoping to achieve with Zyra?"
                    className="min-h-[100px]"
                  />
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleNext} disabled={!useCase}>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Preferences</CardTitle>
                <CardDescription>Customize your experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme Preference</Label>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger id="theme">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System Default</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notifications">Email Notifications</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="notifications"
                        checked={notifications}
                        onChange={(e) => setNotifications(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications about workflow executions, alerts, and product updates.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleComplete} disabled={loading}>
                  {loading ? "Saving..." : "Complete Setup"}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
