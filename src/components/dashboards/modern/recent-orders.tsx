'use client'
import { useState } from "react";

import SimpleBar from 'simplebar-react';
import { CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableHeader,
  TableHead,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchIcon } from "lucide-react";
import { DashboardCard } from "@/components/shared/dashboard-card";
import type { ProductRow } from "./types";

const ProductTableData: ProductRow[] = [
  {
    id: '1',
    project: 'Modernize',
    productImg: '/images/profile/user-2.webp',
    name: 'Emily Carter',
    role: 'Project Manager',
    timeline: '4–6 weeks',
    budget: '$1,499.00',
    statustext: 'On track',
  },
  {
    id: '2',
    project: 'Spike Admin',
    productImg: '/images/profile/user-3.webp',
    name: 'Jason Miller',
    role: 'Web Developer',
    timeline: '6–8 weeks',
    budget: '$1,499.00',
    statustext: 'Delayed',
  },
  {
    id: '3',
    project: 'Material Pro',
    productImg: '/images/profile/user-7.webp',
    name: 'Ryan Scott',
    role: 'UI/UX Designer',
    timeline: '3–5 weeks',
    budget: '$1,499.00',
    statustext: 'Submitted',
  },
  {
    id: '4',
    project: 'Xtreme Admin',
    productImg: '/images/profile/user-6.webp',
    name: 'Olivia Williams',
    role: 'Frontend Developer',
    timeline: '2–4 weeks',
    budget: '$1,499.00',
    statustext: 'Submitted',
  },
];

const statusStyles: Record<ProductRow['statustext'], string> = {
  'On track': 'bg-orange-600/10 text-orange-600',
  Delayed: 'bg-rose-600/10 text-rose-600',
  Submitted: 'bg-chart-2/10 text-chart-2',
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function RecentOrders() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredData = ProductTableData.filter((item) =>
    item.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardCard>
      <CardHeader className='px-6 py-5'>
        <CardTitle className="text-lg font-medium leading-none">Top Selling Products</CardTitle>
        <CardAction>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-56 ps-9 pe-3"
            />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className='p-0'>
        <SimpleBar className="max-h-[450px]">
          <div className="overflow-x-auto">
            <div className="min-w-[550px]">
              <Table>
                <TableHeader className="border-b border-border">
                  <TableRow>
                    <TableHead className="py-2 px-6 text-sm font-normal text-muted-foreground">
                      Project
                    </TableHead>
                    <TableHead className="py-2 px-4 text-sm font-normal text-muted-foreground">
                      Assigned
                    </TableHead>
                    <TableHead className="py-2 px-4 text-sm font-normal text-muted-foreground">
                      Timeline
                    </TableHead>
                    <TableHead className="py-2 px-4 text-sm font-normal text-muted-foreground">
                      Budget
                    </TableHead>
                    <TableHead className="py-2 px-4 text-sm font-normal text-muted-foreground">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap p-3 pl-6">
                        <h4 className="text-sm font-normal">{item.project}</h4>
                      </TableCell>
                      <TableCell className="whitespace-nowrap p-3">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={item.productImg} alt={item.name} />
                            <AvatarFallback>{getInitials(item.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <h6 className="text-sm font-medium">{item.name}</h6>
                            <p className="text-sm font-normal text-muted-foreground">{item.role}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className=" p-3">
                        <h4 className="text-sm font-normal">{item.timeline}</h4>
                      </TableCell>
                      <TableCell className="whitespace-nowrap  p-3">
                        <h4 className="text-sm font-normal">{item.budget}</h4>
                      </TableCell>
                      <TableCell className="p-3">
                        <Badge className={`capitalize ${statusStyles[item.statustext]}`}>
                          {item.statustext}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </SimpleBar>
      </CardContent>
    </DashboardCard>
  );
}
