
# Inputs
input = ARGV[0]

# Aphostrophy gsub
cmd = input.gsub /'/, '\\\\\''
output = `cat #{cmd}`
puts output

# def radioshack_popular_this_week_price ( data )
#   data = data.gsub(/,| |\t|\$/, '')
#   "$" + data
# end
# puts radioshack_popular_this_week_price(input)
# require 'Date'
# def radioshack_popular_this_week_date_to( data )
#         radioshack_popular_this_week_date(data, 1)
#       end

#       def radioshack_popular_this_week_date( data, index )
#         dates = data.split(' - ')
#         puts "#{Date.parse(dates[index])}"
#       end

# radioshack_popular_this_week_date_to(input )

