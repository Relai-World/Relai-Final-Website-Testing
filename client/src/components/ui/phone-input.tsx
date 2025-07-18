import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { COUNTRY_CODES, validatePhone, formatPhoneDisplay } from '@/utils/validation';

interface PhoneInputProps {
  value?: { countryCode: string; phoneNumber: string };
  onChange?: (value: { countryCode: string; phoneNumber: string }) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function PhoneInput({
  value = { countryCode: '+91', phoneNumber: '' },
  onChange,
  placeholder = 'Enter phone number',
  error,
  disabled = false,
  className,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRY_CODES.find(country => country.code === value.countryCode) || COUNTRY_CODES[0]
  );

  const handleCountrySelect = (country: typeof COUNTRY_CODES[0]) => {
    setSelectedCountry(country);
    onChange?.({
      countryCode: country.code,
      phoneNumber: value.phoneNumber,
    });
    setOpen(false);
  };

  const handlePhoneChange = (phoneNumber: string) => {
    // Only allow numbers
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    onChange?.({
      countryCode: selectedCountry.code,
      phoneNumber: cleanNumber,
    });
  };

  const isValid = value.phoneNumber ? validatePhone(selectedCountry.code, value.phoneNumber) : true;

  return (
    <div className={cn('flex flex-col space-y-2', className)}>
      <div className="flex space-x-2">
        {/* Country Code Selector */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-32 justify-between bg-white hover:bg-gray-50 border-gray-300"
              disabled={disabled}
            >
              <span className="flex items-center space-x-2">
                <span>{selectedCountry.flag}</span>
                <span className="text-sm">{selectedCountry.code}</span>
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 phone-input-dropdown">
            <Command className="bg-white">
              <CommandInput placeholder="Search country..." className="bg-white" />
              <CommandList className="bg-white">
                <CommandEmpty className="bg-white">No country found.</CommandEmpty>
                <CommandGroup className="bg-white">
                  {COUNTRY_CODES.map((country) => (
                    <CommandItem
                      key={country.code}
                      value={`${country.country} ${country.code}`}
                      onSelect={() => handleCountrySelect(country)}
                      className="bg-white hover:bg-gray-100 data-[selected]:bg-gray-100"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedCountry.code === country.code ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="flex items-center space-x-2">
                        <span>{country.flag}</span>
                        <span>{country.country}</span>
                        <span className="text-muted-foreground">{country.code}</span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Phone Number Input */}
        <div className="flex-1">
          <Input
            type="tel"
            placeholder={placeholder}
            value={value.phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full',
              (error || !isValid) && 'border-red-500 focus:border-red-500'
            )}
          />
        </div>
      </div>

      {/* Error Message */}
      {(error || !isValid) && (
        <p className="text-sm text-red-500">
          {error || 'Please enter a valid phone number'}
        </p>
      )}

      {/* Format Display */}
      {value.phoneNumber && isValid && (
        <p className="text-sm text-muted-foreground">
          Format: {formatPhoneDisplay(selectedCountry.code, value.phoneNumber)}
        </p>
      )}
    </div>
  );
}