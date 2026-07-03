import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAllCustomers } from "@/hooks/useCustomers";

interface CustomerComboboxProps {
  value: string;
  onValueChange: (customerId: string) => void;
  onAddNew?: () => void;
  placeholder?: string;
  className?: string;
}

export function CustomerCombobox({
  value,
  onValueChange,
  onAddNew,
  placeholder = "Rechercher client (nom ou tél)...",
  className,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: customers = [] } = useAllCustomers();

  const selectedCustomer = customers.find((c) => c.id === value);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone?.includes(q) ?? false) ||
        (c.email?.toLowerCase().includes(q) ?? false)
    );
  }, [customers, search]);

  const displayValue = selectedCustomer
    ? `${selectedCustomer.name}${selectedCustomer.phone ? ` - ${selectedCustomer.phone}` : ""}`
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !displayValue && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Nom, téléphone ou email..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-2 text-center text-sm text-muted-foreground">
                Aucun client trouvé
              </div>
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onValueChange("");
                  setOpen(false);
                  setSearch("");
                }}
              >
                <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                Client anonyme
              </CommandItem>
              {filtered.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={() => {
                    onValueChange(customer.id);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === customer.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span className="font-medium">{customer.name}</span>
                    {customer.phone && (
                      <span className="text-xs text-muted-foreground">{customer.phone}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {onAddNew && (
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setSearch("");
                    onAddNew();
                  }}
                  className="text-primary"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Ajouter un nouveau client
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
