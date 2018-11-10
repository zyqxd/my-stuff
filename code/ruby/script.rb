#!/usr/bin/env ruby
file = File.open('text.txt')
out = File.open('jsons.txt', 'w')

file.each do |line|
	tokens = line.split("|")
	sku = tokens[0]
	category = tokens[1]

	output = MerchantApi::Menards.new.product sku
	if output == nil
		puts 'no'
	else 	
		puts 'yes ' + sku
		out.puts output
	end
end