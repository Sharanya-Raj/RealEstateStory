import { agents, howlAgent } from "@/data/mockData";

export const Footer = () => (
  <footer className="border-t border-border py-8 mt-16">
    <div className="container mx-auto px-4 flex flex-col items-center gap-4">
      <div className="flex gap-2">
        {[...agents, howlAgent].map((a) => (
          <span key={a.id} className="text-lg opacity-60 hover:opacity-100 transition-opacity cursor-default" title={a.name}>
            {a.emoji}
          </span>
        ))}
      </div>
      <p className="font-handwritten text-lg text-muted-foreground">
        Made with ✨ by NestSpirits Team | Hackathon 2025
      </p>
    </div>
  </footer>
);
