# Aphostrophy gsub
# filename = ARGV[0]
# cmd = filename.gsub /'/, '\\\\\''
# output = `cat #{cmd}`
# puts output

# def radioshack_popular_this_week_price( data )
#   if data.present?
#     data = data.gsub(/,| |\t|\$/, '')
#   end

#   data
# end

def radioshack_popular_this_week_date_to( data )
  radioshack_popular_this_week_date(1)
end

def radioshack_popular_this_week_date( argument )
  dates = data.split(' - ')
  puts date[argument]
end

