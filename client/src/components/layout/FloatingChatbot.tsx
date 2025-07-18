import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function FloatingChatbot() {
  return (
    <>
      {/* Floating Chatbot Button - Redirects to Web Bot Page */}
      <div className="fixed bottom-24 right-6 z-50">
        <Link href="/web-bot">
          <Button
            className="w-14 h-14 rounded-full shadow-lg p-0 bg-[#1752FF] hover:bg-[#1442CC] transition-all duration-200"
          >
            <Bot className="h-6 w-6 text-white" />
            <span className="sr-only">Open AI Chatbot</span>
          </Button>
        </Link>
      </div>
    </>
  );
}