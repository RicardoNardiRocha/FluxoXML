"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarIcon, Filter, RefreshCw, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Filters {
  client: string;
  status: 'all' | 'Autorizada' | 'Cancelada';
  month?: Date;
  cfop: string;
}

interface FilterControlsProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
  onClearAll?: () => void;
}

export function FilterControls({
  filters,
  onFilterChange,
  onClearAll,
}: FilterControlsProps) {

  const handleResetFilters = () => {
    onFilterChange({
        client: '',
        status: 'all',
        month: undefined,
        cfop: '',
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros de Consulta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="client-filter">Cliente / Fornecedor</Label>
            <Input
              id="client-filter"
              placeholder="Nome do cliente ou fornecedor"
              value={filters.client}
              onChange={(e) =>
                onFilterChange({ ...filters, client: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cfop-filter">CFOP</Label>
            <Input
              id="cfop-filter"
              placeholder="Ex: 5102"
              value={filters.cfop}
              onChange={(e) =>
                onFilterChange({ ...filters, cfop: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status-filter">Situação da Nota</Label>
            <Select
              value={filters.status}
              onValueChange={(value: Filters['status']) =>
                onFilterChange({ ...filters, status: value })
              }
            >
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Selecione a situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="Autorizada">Autorizada</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Mês de Emissão</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !filters.month && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.month ? (
                    format(filters.month, "MMMM 'de' yyyy", { locale: ptBR })
                ) : (
                  <span>Selecione um mês</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.month}
                onSelect={(date) => onFilterChange({ ...filters, month: date })}
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex justify-end pt-2 gap-2">
          <Button variant="ghost" onClick={handleResetFilters}>
            <X className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
           {onClearAll && (
            <Button variant="outline" onClick={onClearAll}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Limpar e Reiniciar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
