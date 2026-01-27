import { DashboardEntrada } from '@/components/dashboard-entrada';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { FileText, LogIn, LogOut } from 'lucide-react';

export default function LivroEntradaPage() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="h-20 flex items-center p-4">
          <div className="flex items-center justify-center gap-3">
            <FileText className="size-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground group-data-[collapsible=icon]:hidden">
              ContabilX
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <a href="/">
                <SidebarMenuButton tooltip="Livro de Saída">
                  <LogOut />
                  <span>Livro de Saída</span>
                </SidebarMenuButton>
              </a>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <a href="/livro-entrada">
                <SidebarMenuButton isActive tooltip="Livro de Entrada">
                  <LogIn />
                  <span>Livro de Entrada</span>
                </SidebarMenuButton>
              </a>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <ThemeToggle />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-20 items-center justify-between border-b bg-background/50 px-6 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-semibold">Livro de Entrada</h2>
            <p className="text-sm text-muted-foreground">
              Visualize e gerencie suas notas fiscais de entrada.
            </p>
          </div>
        </header>
        <main className="flex-1 space-y-6 p-6">
          <DashboardEntrada />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
