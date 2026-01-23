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
import { Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Filters {
  client: string;
  status: 'all' | 'Autorizada' | 'Cancelada';
  dateRange: DateRange;
}

interface FilterControlsProps {
  filters: Filters;
  onFilterChange: (filters: Filters) => void;
}

export function FilterControls({
  filters,
  onFilterChange,
}: FilterControlsProps) {

  const handleReset = () => {
    onFilterChange({
        client: '',
        status: 'all',
        dateRange: { from: undefined, to: undefined },
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Label>Período de Emissão</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !filters.dateRange.from && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateRange.from ? (
                  filters.dateRange.to ? (
                    <>
                      {format(filters.dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                      {format(filters.dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                    </>
                  ) : (
                    format(filters.dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                  )
                ) : (
                  <span>Selecione um período</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={filters.dateRange}
                onSelect={(range) => onFilterChange({ ...filters, dateRange: range || {} })}
                numberOfMonths={2}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={handleReset}>
            <X className="mr-2 h-4 w-4" />
            Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
