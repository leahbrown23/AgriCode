"use client"

import { ArrowLeft, Filter } from "lucide-react"

export default function DiscussionForumScreen({ onBackClick }) {
  return (
    <div className="flex flex-col h-full pb-12">
      <div className="p-4 bg-white flex items-center">
        <button onClick={onBackClick} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-semibold flex-1 text-center">Discussion Forum</h1>
      </div>

      <div className="flex-1 p-4 bg-[#d1e6b2]">
        {/* Chats header with filter */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Chats</h2>
          <button>
            <Filter className="h-5 w-5" />
          </button>
        </div>

        {/* Chat list */}
        <div className="space-y-3">
          {/* Rotanda Walnutz */}
          <div className="bg-white rounded-lg p-3 flex">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
            <div className="ml-3 flex-1">
              <h3 className="font-medium text-sm">Rotanda Walnutz:</h3>
              <p className="text-xs text-gray-700">
                Have you noticed improvements in yield after adjusting your soil pH and nutrient levels?
              </p>
            </div>
          </div>

          {/* Berry Blaze */}
          <div className="bg-white rounded-lg p-3 flex">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
            <div className="ml-3 flex-1">
              <h3 className="font-medium text-sm">Berry Blaze:</h3>
              <p className="text-xs text-gray-700">
                Has anyone used mulch or cover crops to improve moisture retention?
              </p>
            </div>
          </div>

          {/* Wine Hill */}
          <div className="bg-white rounded-lg p-3 flex">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
            <div className="ml-3 flex-1">
              <h3 className="font-medium text-sm">Wine Hill:</h3>
              <p className="text-xs text-gray-700">
                Would you be willing to share soil test results from your farm with the group to compare and learn?
              </p>
            </div>
          </div>

          {/* Thermal Heights */}
          <div className="bg-white rounded-lg p-3 flex">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
            <div className="ml-3 flex-1">
              <h3 className="font-medium text-sm">Thermal Heights:</h3>
              <p className="text-xs text-gray-700">
                What are the most common soil problems you face each year and how do you address them?
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
