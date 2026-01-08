import { Dashboard } from '@/components/dashboard';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { FileText, Home as HomeIcon, Settings } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

function UserMenu() {
  const userAvatar = PlaceHolderImages.find((p) => p.id === 'user-avatar');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            {userAvatar && (
              <Image
                src={userAvatar.imageUrl}
                alt="User avatar"
                width={40}
                height={40}
                data-ai-hint={userAvatar.imageHint}
                className="rounded-full"
              />
            )}
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Minha Empresa</p>
            <p className="text-xs leading-none text-muted-foreground">
              contato@minhaempresa.com
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Configurações</DropdownMenuItem>
        <DropdownMenuItem>Suporte</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Sair</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function HomePage() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="h-20 flex items-center p-4">
          <div className="flex items-center justify-center gap-3">
            <FileText className="size-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground group-data-[collapsible=icon]:hidden">
              FiscalFlow
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton isActive tooltip="Livro de Saída">
                <HomeIcon />
                <span>Livro de Saída</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Configurações">
                <Settings />
                <span>Configurações</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-20 items-center justify-between border-b bg-background/50 px-6 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-semibold">Livro de Saída</h2>
            <p className="text-sm text-muted-foreground">
              Visualize e gerencie suas notas fiscais de saída.
            </p>
          </div>
          <UserMenu />
        </header>
        <main className="flex-1 space-y-6 p-6">
          <Dashboard />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
