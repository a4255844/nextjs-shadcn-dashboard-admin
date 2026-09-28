'use client'
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarDays, RefreshCcw, Download, Sun, Moon } from 'lucide-react';


export default function OverviewTab() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon');
    } else if (hour >= 17 && hour < 21) {
      setGreeting('Good Evening');
    } else {
      setGreeting('Good Night');
    }
  }, []);

  const getGreetingIcon = () => {
    if (greeting === 'Good Morning' || greeting === 'Good Afternoon') {
      return <Sun size={25} color="orange" />;
    } else {
      return <Moon size={25} />;
    }
  };

  const dropdownItems = ['Monthly', 'Yearly'];
  const [selectedYear, setSelectedYear] = useState(dropdownItems[0]);

  return (
    <>
      <div className="flex items-center flex-wrap lg:flex-nowrap lg:gap-0 gap-4 justify-between">
        <div className='flex flex-col items-start'>
          <h2 className="text-xl flex item-center gap-2">
            {greeting}, Cameron <span className="flex items-center">{getGreetingIcon()}</span>
          </h2>
          <p className='text-sm font-normal text-muted-foreground'>Stay informed with today’s analytics</p>
        </div>
        <div className="flex items-center lg:flex-nowrap flex-wrap gap-2">
          <Button variant="outline" size="icon" aria-label="Refresh">
            <RefreshCcw size={16} />
          </Button>
          <Select value={selectedYear} onValueChange={(value) => value && setSelectedYear(value)}>
            <SelectTrigger className="w-fit gap-2">
              <CalendarDays size={16} className="text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              position="popper"
              align="start"
              sideOffset={4}
              className="rounded-md shadow-md"
            >
              {dropdownItems.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button className="gap-2 px-4">
            <Download size={16} />
            <span className="text-sm font-medium">Export</span>
          </Button>
        </div>
      </div>
    </>
  );
}
